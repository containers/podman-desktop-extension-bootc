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

import type { ContainerCreateOptions } from '@podman-desktop/api';
import * as extensionApi from '@podman-desktop/api';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { resolve } from 'node:path';
import * as containerUtils from './container-utils';
import * as machineUtils from './machine-utils';
import { bootcImageBuilderContainerName, bootcImageBuilderName } from './constants';
import type { History } from './history';

const telemetryLogger = extensionApi.env.createTelemetryLogger();

export async function buildDiskImage(imageData: unknown, history: History) {
  // Before we do ANYTHING, we should be checking to see if the podman machine is rootful or not
  // as that's a requirement for bootc-image-builder to work correctly.

  // Only do this check on Windows or Mac

  if (!machineUtils.isLinux()) {
    const isRootful = await machineUtils.isPodmanMachineRootful();
    if (!isRootful) {
      await extensionApi.window.showErrorMessage(
        'The podman machine is not set as rootful. Please recreate the podman machine with rootful privileges set and try again.',
      );
      return;
    }
  }

  const image = imageData as { name: string; engineId: string; tag: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const telemetryData: Record<string, any> = {};

  const selection = await extensionApi.window.showQuickPick(
    [
      { label: 'QCOW2', detail: 'QEMU image (.qcow2)', format: 'qcow2' },
      { label: 'AMI', detail: 'Amazon Machine Image (.ami)', format: 'ami' },
      { label: 'RAW', detail: 'Raw image (.raw) with an MBR or GPT partition table', format: 'raw' },
      { label: 'ISO', detail: 'ISO standard disk image (.iso) for flashing media and using EFI', format: 'iso' },
    ],
    {
      title: 'Select the type of disk image to create',
    },
  );
  if (!selection) {
    telemetryData.canceled = true;
    telemetryLogger.logUsage('buildDiskImage', telemetryData);
    return;
  }
  const selectedType = selection.format;
  telemetryData.imageType = selectedType;

  const location = history.getLastLocation() || os.homedir();
  const selectedFolder = await extensionApi.window.showInputBox({
    prompt: 'Select the folder to generate disk' + selectedType + ' into',
    value: location,
    ignoreFocusOut: true,
  });
  if (!selectedFolder) {
    telemetryData.canceled = true;
    telemetryLogger.logUsage('buildDiskImage', telemetryData);
    return;
  }
  // Make this into a map that 'qcow2' -> 'disk.qcow2'
  // and 'ami' -> 'qcow2/disk.raw'
  // and 'raw' -> 'image/disk.raw'
  // and 'iso' -> 'bootiso/disk.iso'
  // and then use that to build the path
  const imageNameMap = {
    qcow2: 'qcow2/disk.qcow2',
    ami: 'image/disk.raw',
    raw: 'image/disk.raw',
    iso: 'bootiso/disk.iso',
  };
  let imagePath = '';
  imagePath = resolve(selectedFolder, imageNameMap[selectedType]);

  if (
    fs.existsSync(imagePath) &&
    (await extensionApi.window.showWarningMessage('File already exists, do you want to overwrite?', 'Yes', 'No')) ===
      'No'
  ) {
    telemetryData.overwrite = true;
    telemetryData.canceled = true;
    telemetryLogger.logUsage('buildDiskImage', telemetryData);
    return;
  }

  // store this path for later
  await history.addImageBuild(image.name, selectedType, selectedFolder);

  return extensionApi.window.withProgress(
    { location: extensionApi.ProgressLocation.TASK_WIDGET, title: 'Building disk image ' + image.name },
    async progress => {
      const buildContainerName = image.name.split('/').pop() + bootcImageBuilderContainerName;
      let successful: boolean;
      let errorMessage: string;
      let logData: string = 'Build Image Log --------\n';
      logData += 'Image:  ' + image.name + '\n';
      logData += 'Type:   ' + selectedType + '\n';
      logData += 'Folder: ' + selectedFolder + '\n';
      logData += '----------\n';

      // Create log folder
      if (!fs.existsSync(selectedFolder)) {
        fs.mkdirSync(selectedFolder, { recursive: true });
      }
      const logPath = resolve(selectedFolder, 'image-build.log');
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
      }

      // Preliminary Step 0. Create the "bootc-image-builder" container
      // options that we will use to build the image. This will help with debugging
      // as well as making sure we delete the previous build, etc.
      const containerName = await getUnusedName(buildContainerName);
      const buildImageContainer = createBuilderImageOptions(
        containerName,
        image.name + ':' + image.tag,
        selectedType,
        selectedFolder,
        imagePath,
      );
      logData += JSON.stringify(buildImageContainer, undefined, 2);
      logData += '\n----------\n';

      try {
        // Step 1. Pull bootcImageBuilder
        // Pull the bootcImageBuilder since that
        // is what is being used to build images within BootC
        // Do progress report here so it doesn't look like it's stuck
        // since we are going to pull an image
        progress.report({ increment: 4 });
        await containerUtils.pullImage(buildImageContainer.Image);

        // delete previous copies of the image (in case we have upgraded it)
        await containerUtils.deleteOldImages(image.engineId, buildImageContainer.Image);

        // Step 2. Check if there are any previous builds and remove them
        progress.report({ increment: 5 });
        await containerUtils.removeContainerIfExists(image.engineId, buildImageContainer.name);

        // Step 3. Create and start the container for the actual build
        progress.report({ increment: 6 });
        const containerId = await containerUtils.createAndStartContainer(image.engineId, buildImageContainer);

        // Step 3.1 Since we have started the container, we can now go get the logs
        await logContainer(image, containerId, progress, data => {
          logData += data;
        });

        // Step 4. Wait for the container to exit
        // This function will ensure it exits with a zero exit code
        // if it does not, it will error out.
        progress.report({ increment: 7 });
        await containerUtils.waitForContainerToExit(containerId);

        // If we get here, the container has exited with a zero exit code
        // it's successful as well so we will write the log file
        successful = true;
        telemetryData.success = true;
      } catch (error) {
        errorMessage = error.message;
        console.error(error);
        telemetryData.error = error;
      } finally {
        // Regardless, write the log file and ignore if we can't even write it.
        try {
          fs.writeFileSync(logPath, logData, { flag: 'w' });
        } catch (e) {
          // ignore
        }

        // ###########
        // # CLEANUP #
        // ###########
        // Regardless what happens, we will need to clean up what we started (if anything)
        // which could be containers, volumes, images, etc.
        await containerUtils.removeContainerAndVolumes(image.engineId, buildImageContainer.name);
      }

      // Mark the task as completed
      progress.report({ increment: -1 });
      telemetryLogger.logUsage('buildDiskImage', telemetryData);

      if (successful) {
        await extensionApi.window.showInformationMessage(
          `Success! Your Bootable OS Container has been succesfully created to ${imagePath}`,
          'OK',
          'Cancel',
        );
      } else {
        await extensionApi.window.showErrorMessage(
          `There was an error building the image: ${errorMessage}. Check logs at ${logPath}`,
          'OK',
          'Cancel',
        );
      }
    },
  );
}

async function logContainer(image, containerId: string, progress, callback: (data: string) => void): Promise<void> {
  await extensionApi.containerEngine.logsContainer(image.engineId, containerId, (_name: string, data: string) => {
    if (data) {
      callback(data);
      // look for specific output to mark incremental progress
      if (data.includes('org.osbuild.rpm')) {
        progress.report({ increment: 8 });
      } else if (data.includes('org.osbuild.selinux')) {
        progress.report({ increment: 25 });
      } else if (data.includes('org.osbuild.ostree.config')) {
        progress.report({ increment: 48 });
      } else if (data.includes('org.osbuild.qemu')) {
        progress.report({ increment: 59 });
      } else if (data.includes('Build complete!')) {
        progress.report({ increment: 98 });
      }
    }
  });
}

// find an unused container name
export async function getUnusedName(name: string): Promise<string> {
  let containers: string[] = [];
  try {
    // get a list of all existing container names, which may start with /
    containers = (await extensionApi.containerEngine.listContainers())
      .map(c => c.Names)
      .reduce((a, val) => [...a, ...val], [])
      .map(n => (n.charAt(0) === '/' ? n.substring(1) : n));
  } catch (e) {
    console.warn('Could not get existing container names');
    console.warn(e);
  }

  let unusedName = name;
  let count = 2;
  while (containers.includes(unusedName)) {
    unusedName = name + '-' + count++;
  }
  return unusedName;
}

// Create builder options for the "bootc-image-builder" container
export function createBuilderImageOptions(
  name: string,
  image: string,
  type: string,
  folder: string,
  imagePath: string,
): ContainerCreateOptions {
  // Create the image options for the "bootc-image-builder" container
  const options: ContainerCreateOptions = {
    name: name,
    Image: bootcImageBuilderName,
    Tty: true,
    HostConfig: {
      Privileged: true,
      SecurityOpt: ['label=type:unconfined_t'],
      Binds: [folder + ':/output/'],
    },

    // Add the appropriate labels for it to appear correctly in the Podman Desktop UI.
    Labels: {
      'bootc.image.builder': 'true',
      'bootc.build.image.location': imagePath,
      'bootc.build.type': type,
    },
    Cmd: [image, '--type', type, '--output', '/output/'],
  };

  return options;
}
