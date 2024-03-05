/**********************************************************************
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import * as extensionApi from '@podman-desktop/api';
import * as fs from 'node:fs';

const telemetryLogger = extensionApi.env.createTelemetryLogger();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function launchVFKit(container: any): Promise<void> {
  const imageLocation = container.labels['bootc.build.image.location'];

  // Check that vfkit is installed and error if it isn't before executing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const telemetryData: Record<string, any> = {};
  telemetryData.imageType = container.labels['bootc.build.type'];
  try {
    await extensionApi.process.exec('vfkit', ['--version']);
  } catch (error) {
    await extensionApi.window.showErrorMessage(`Unable to launch ${imageLocation} with vfkit: ${error}`);
    telemetryData.error = 'no-version';
    telemetryLogger.logUsage('launchVfkit', telemetryData);
    return;
  }

  // Check to see if imageLocation exists and error if it doesn't before executing
  if (!fs.existsSync(imageLocation)) {
    await extensionApi.window.showErrorMessage(
      `Unable to launch ${imageLocation} with vfkit: ${imageLocation} does not exist`,
    );
    telemetryData.error = 'no-image';
    telemetryLogger.logUsage('launchVfkit', telemetryData);
    return;
  }

  // Check container.labels['bootc.build.type'] to see if it is ami or raw
  // if it is not raw or ami, we cannot launch with vfkit
  if (container.labels['bootc.build.type'] !== 'ami' && container.labels['bootc.build.type'] !== 'raw') {
    await extensionApi.window.showErrorMessage(
      `Unable to launch ${imageLocation} with vfkit: ${container.labels['bootc.build.type']} is not supported`,
    );
    telemetryData.error = 'unsupported-type';
    telemetryLogger.logUsage('launchVfkit', telemetryData);
    return;
  }

  await launchVfkit(imageLocation, telemetryData);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function launchVfkit(imagePath: string, telemetryData: Record<string, any>): Promise<void> {
  // take image path replace last part (disk.qcow2 / disk.raw) with vfkit-serial.log
  // this will be the log file path
  const logFilePath = imagePath.replace(/[^/]+$/, '') + 'vfkit-serial.log';
  const command = 'vfkit';
  const args = [
    '--cpus',
    '2',
    '--memory',
    '2048',
    '--bootloader',
    'efi,variable-store=./efi-variable-store,create',
    '--device',
    'virtio-blk,path=' + imagePath,
    '--device',
    'virtio-serial,logFilePath=' + logFilePath,
    '--device',
    'virtio-net,nat,mac=72:20:43:d4:38:62',
    '--device',
    'virtio-rng',
    '--device',
    'virtio-input,keyboard',
    '--device',
    'virtio-input,pointing',
    '--device',
    'virtio-gpu,width=1920,height=1080',
    '--gui',
  ];
  console.log(args);
  try {
    await extensionApi.process.exec(command, args);
    telemetryData.success = true;
    telemetryLogger.logUsage('launchVfkit', telemetryData);
  } catch (error) {
    console.error(error);
    telemetryData.error = error;
    telemetryLogger.logUsage('launchVfkit', telemetryData);
    await extensionApi.window.showErrorMessage(`Unable to launch ${imagePath} with vfkit: ${error}`);
  }
}
