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
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { satisfies, coerce } from 'semver';

// Async function to get machine information in JSON format
async function getMachineInfo() {
  const { stdout: machineInfoJson } = await extensionApi.process.exec(getPodmanCli(), [
    'machine',
    'info',
    '--format',
    'json',
  ]);
  return JSON.parse(machineInfoJson);
}

// Read the machine configuration and error out if we are uanble to read it.
async function readMachineConfig(machineConfigDir: string, currentMachine: string) {
  const filepath = path.join(machineConfigDir, `${currentMachine}.json`);

  // Check if the file exists before reading it
  if (!fs.existsSync(filepath)) {
    throw new Error(`Machine config file ${filepath} does not exist.`);
  }

  const machineConfigJson = await fs.promises.readFile(filepath, 'utf8');
  return JSON.parse(machineConfigJson);
}

// Check if the current podman machine is rootful
export async function isPodmanMachineRootful() {
  try {
    const machineInfo = await getMachineInfo();
    const machineConfig = await readMachineConfig(machineInfo.Host.MachineConfigDir, machineInfo.Host.CurrentMachine);

    // If you are on Podman Machine 4.9.0 with applehv activated, the rootful key will be located
    // in the root of the JSON object.
    // If on 5.0.0, the rootful key will be located in the "HostUser" object.
    if (machineConfig?.HostUser?.Rootful) {
      // 5.0.0 check first
      return Boolean(machineConfig.HostUser.Rootful);
    } else if (machineConfig?.Rootful) {
      // 4.9.0 check
      console.log(
        'Rootful key found in root object of the machine config file, you could be on Podman Machine v4, it is recommended to upgrade to v5.',
      );
      return Boolean(machineConfig.Rootful);
    } else {
      console.error('No Rootful key found in machine config file, there should be one.');
      return false;
    }
  } catch (error) {
    console.error('Error when checking rootful machine status:', error);
    return false; // Ensure function returns a boolean even in case of error
  }
}

// Check if the current podman machine is v5 or above
export async function isPodmanV5Machine() {
  try {
    const machineInfo = await getMachineInfo();

    const ver = machineInfo.Version.Version;
    // Attempt to parse the version, handling undefined if it fails
    const coercedVersion = coerce(ver);
    if (!coercedVersion) {
      // Handle the case where the version could not be coerced successfully
      console.error('Unable to parse Podman machine version:', ver);
      return false;
    }
    // Check if the coerced version satisfies the range, including pre-release versions,
    // this means 5.0.0-dev will pass
    return satisfies(coercedVersion, '>=5.0.0', { includePrerelease: true });
  } catch (error) {
    console.error('Error when checking Podman machine version:', error);
    return false; // Ensure function returns a boolean even in case of error
  }
}

// Below functions are borrowed from the podman extension
function getPodmanCli(): string {
  const customBinaryPath = getCustomBinaryPath();
  if (customBinaryPath) {
    return customBinaryPath;
  }

  if (isWindows()) {
    return 'podman.exe';
  }
  return 'podman';
}

function getCustomBinaryPath(): string | undefined {
  return extensionApi.configuration.getConfiguration('podman').get('binary.path');
}

const windows = os.platform() === 'win32';
export function isWindows(): boolean {
  return windows;
}

const linux = os.platform() === 'linux';
export function isLinux(): boolean {
  return linux;
}
