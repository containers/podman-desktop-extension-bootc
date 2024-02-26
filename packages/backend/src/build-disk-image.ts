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
import * as fs from 'node:fs';
import { resolve } from 'node:path';
import * as containerUtils from './container-utils';
import * as machineUtils from './machine-utils';
import { bootcImageBuilderContainerName, bootcImageBuilderName } from './constants';
import type { BootcBuildOptions } from '@shared/src/models/build';

export async function buildDiskImage(build: BootcBuildOptions): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const telemetryData: Record<string, any> = {};
  let errorMessage: string;

  // VALIDATION CHECKS
  if (!build.name) {
    await extensionApi.window.showErrorMessage('Bootc image name is required.');
    return;
  }
  if (!build.tag) {
    await extensionApi.window.showErrorMessage('Bootc image tag is required.');
    return;
  }
  if (!build.type) {
    await extensionApi.window.showErrorMessage('Bootc image type is required.');
    return;
  }
  if (!build.engineId) {
    await extensionApi.window.showErrorMessage('Bootc image engineId is required.');
    return;
  }
  if (!build.folder) {
    await extensionApi.window.showErrorMessage('Bootc image folder is required.');
    return;
  }
  if (!build.arch) {
    await extensionApi.window.showErrorMessage('Bootc image architecture is required.');
    return;
  }

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

  let imageName = ''; // Initialize imageName as an empty string

  // Check build.type and assign imageName accordingly
  if (build.type === 'qcow2') {
    imageName = 'qcow2/disk.qcow2';
  } else if (build.type === 'ami') {
    imageName = 'image/disk.raw';
  } else if (build.type === 'raw') {
    imageName = 'image/disk.raw';
  } else if (build.type === 'iso') {
    imageName = 'bootiso/disk.iso';
  } else {
    // If build.type is not one of the expected values, show an error and return
    await extensionApi.window.showErrorMessage('Invalid image format selected.');
    return;
  }

  const imagePath = resolve(build.folder, imageName);

  if (
    fs.existsSync(imagePath) &&
    (await extensionApi.window.showWarningMessage('File already exists, do you want to overwrite?', 'Yes', 'No')) ===
      'No'
  ) {
    return;
  }

  return extensionApi.window.withProgress(
    { location: extensionApi.ProgressLocation.TASK_WIDGET, title: 'Building disk image ' + build.name },
    async progress => {
      const buildContainerName = build.name.split('/').pop() + bootcImageBuilderContainerName;
      let successful: boolean = false;
      let logData: string = 'Build Image Log --------\n';
      logData += 'Image:  ' + build.name + '\n';
      logData += 'Type:   ' + build.type + '\n';
      logData += 'Folder: ' + build.folder + '\n';
      logData += '----------\n';

      // Create log folder
      if (!fs.existsSync(build.folder)) {
        fs.mkdirSync(build.folder, { recursive: true });
      }
      const logPath = resolve(build.folder, 'image-build.log');
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
      }

      // Preliminary Step 0. Create the "bootc-image-builder" container
      // options that we will use to build the image. This will help with debugging
      // as well as making sure we delete the previous build, etc.
      const containerName = await getUnusedName(buildContainerName);
      const buildImageContainer = createBuilderImageOptions(
        containerName,
        build.name + ':' + build.tag,
        build.type,
        build.arch,
        build.folder,
        imagePath,
      );
      logData += JSON.stringify(buildImageContainer, undefined, 2);
      logData += '\n----------\n';

      if (!buildImageContainer) {
        await extensionApi.window.showErrorMessage('Error creating container options.');
        return;
      }
      try {
        // Step 1. Pull bootcImageBuilder
        // Pull the bootcImageBuilder since that
        // is what is being used to build images within BootC
        // Do progress report here so it doesn't look like it's stuck
        // since we are going to pull an image
        progress.report({ increment: 4 });
        if (buildImageContainer.Image) {
          await containerUtils.pullImage(buildImageContainer.Image);
        } else {
          throw new Error('No image to pull');
        }

        // Step 2. Check if there are any previous builds and remove them
        progress.report({ increment: 5 });
        if (buildImageContainer.name) {
          await containerUtils.removeContainerIfExists(build.engineId, buildImageContainer.name);
        } else {
          throw new Error('No container name to remove');
        }

        // Step 3. Create and start the container for the actual build
        progress.report({ increment: 6 });
        const containerId = await containerUtils.createAndStartContainer(build.engineId, buildImageContainer);

        // Step 3.1 Since we have started the container, we can now go get the logs
        await logContainer(build.engineId, containerId, progress, data => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
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
        if (buildImageContainer.name) {
          await containerUtils.removeContainerAndVolumes(build.engineId, buildImageContainer.name);
        }
      }

      // Mark the task as completed
      progress.report({ increment: -1 });

      if (successful) {
        await extensionApi.window.showInformationMessage(
          `Success! Your Bootable OS Container has been succesfully created to ${imagePath}`,
          'OK',
        );
      } else {
        if (!errorMessage.endsWith('.')) {
          errorMessage += '.';
        }
        await extensionApi.window.showErrorMessage(
          `There was an error building the image: ${errorMessage} Check logs at ${logPath}`,
          'OK',
        );
        // Make sure we still throw an error even after displaying an error message.
        throw new Error(errorMessage);
      }
    },
  );
}

async function logContainer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engineId: any,
  containerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  progress: any,
  callback: (data: string) => void,
): Promise<void> {
  await extensionApi.containerEngine.logsContainer(engineId, containerId, (_name: string, data: string) => {
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
  arch: string,
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
    Cmd: [image, '--type', type, '--target-arch', arch, '--output', '/output/'],
  };

  return options;
}
