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

import type { ContainerCreateOptions, ExtensionContext } from '@podman-desktop/api';
import * as extensionApi from '@podman-desktop/api';
import { BootC } from './bootc';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { resolve } from 'node:path';

let bootc: BootC | undefined;
const bootcImageBuilderContainerName = '-bootc-image-builder';
const bootcImageBuilderName = 'quay.io/centos-bootc/bootc-image-builder:latest-1704948606';
let diskImageBuildingName: string;

export async function activate(extensionContext: ExtensionContext): Promise<void> {
  bootc = new BootC(extensionContext);
  await bootc?.activate();

  extensionContext.subscriptions.push(

    extensionApi.commands.registerCommand('bootc.vfkit', async container => {
      let imageLocation = container.labels['bootc.build.image.location'];

      // Check that vfkit is installed and error if it isn't before executing
      try {
        await extensionApi.process.exec('vfkit', ['--version']);
      } catch (error) {
        await extensionApi.window.showErrorMessage(`Unable to launch ${imageLocation} with vfkit: ${error}`);
        return;
      }

      // Check to see if imageLocation exists and error if it doesn't before executing 
      if (!fs.existsSync(imageLocation)) {
        await extensionApi.window.showErrorMessage(`Unable to launch ${imageLocation} with vfkit: ${imageLocation} does not exist`);
        return;
      }

      // Check container.labels['bootc.build.type'] to see if it is ami or raw
      // if it is not raw or ami, we cannot launch with vfkit
      if (container.labels['bootc.build.type'] !== 'ami' && container.labels['bootc.build.type'] !== 'raw') {
        await extensionApi.window.showErrorMessage(`Unable to launch ${imageLocation} with vfkit: ${container.labels['bootc.build.type']} is not supported`);
        return;
      }

      await launchVfkit(imageLocation);
    }),

    extensionApi.commands.registerCommand('bootc.image.build', async image => {
      const selectedType = await extensionApi.window.showQuickPick(['qcow2', 'ami', 'raw', 'iso'], {
        placeHolder: 'Select image type',
      });
      if (!selectedType) {
        return;
      }

      const selectedFolder = await extensionApi.window.showInputBox({
        prompt: 'Select the folder to generate disk' + selectedType + ' into',
        value: os.homedir(),
        ignoreFocusOut: true,
      });
      if (!selectedFolder) {
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
        (await extensionApi.window.showWarningMessage(
          'File already exists, do you want to overwrite?',
          'Yes',
          'No',
        )) === 'No'
      ) {
        return;
      }

      return extensionApi.window.withProgress(
        { location: extensionApi.ProgressLocation.TASK_WIDGET, title: 'Building disk image ' + image.name },
        async progress => {

          // Use the image name and append bootc-image-builder to the end
          diskImageBuildingName = image.name.split('/').pop() + bootcImageBuilderContainerName;

          let successful: boolean;

          // Create log folder
          if (!fs.existsSync(selectedFolder)) {
            await fs.mkdirSync(selectedFolder, { recursive: true });
          }
          const logPath = resolve(selectedFolder, 'image-build.log');
          if (fs.existsSync(logPath)) {
            await fs.unlinkSync(logPath);
          }

          let logData: string = 'Build Image Log --------\n';
          try {
            await pullBootcImageBuilderImage();
            progress.report({ increment: 4 });

            await removePreviousBuildImage(image);
            progress.report({ increment: 5 });

            const containerId = await createImage(image, selectedType, selectedFolder, imagePath);
            progress.report({ increment: 6 });

            await logContainer(image, containerId, progress, data => {
              logData += data;
              console.log('log:' + logData);
            });

            // Wait for container to exit so that the task doesn't end and we can monitor progress
            let containerRunning = true;
            while (containerRunning) {
              await extensionApi.containerEngine.listContainers().then(containers => {
                containers.forEach(container => {
                  // check if container is stopped
                  if (container.Id === containerId && container.State === 'exited') {
                    // remove the container
                    // Cant do this until we extract the logs
                    //extensionApi.containerEngine.deleteContainer(image.engineId, containerId);
                    containerRunning = false;
                  }
                });
              });
              await new Promise(r => setTimeout(r, 1000));
            }

            successful = true;

            fs.writeFileSync(logPath, logData, { flag: 'w' });
          } catch (error) {
            console.error(error);
            try {
              fs.writeFileSync(logPath, logData, { flag: 'w' });
            } catch (e) {
              // ignore
            }
            await extensionApi.window.showErrorMessage(
              `Unable to build disk image: ${error}. Check logs at ${logPath}`,
            );
          }

          // Mark the task as completed
          progress.report({ increment: -1 });

          // Only if success = true and type = ami
          if ((successful && selectedType === 'ami') || selectedType === 'raw') {
            const result = await extensionApi.window.showInformationMessage(
              `Success! Your Bootable OS Container has been succesfully created to ${imagePath}`,
              'OK',
              'Cancel',
            );
          }
        },
      );
    }),
  );
}

async function launchVfkit(imagePath: string): Promise<void> {
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
  } catch (error) {
    console.error(error);
    await extensionApi.window.showErrorMessage(`Unable to launch ${imagePath} with vfkit: ${error}`);
  }
}

async function removePreviousBuildImage(image) {
  // TODO: Ignore if the container doesn't exist
  try {
    await extensionApi.containerEngine.deleteContainer(image.engineId, diskImageBuildingName);
  } catch (e) {
    console.log(e);
  }
}

async function pullBootcImageBuilderImage() {
  // get all engines
  const providerConnections = extensionApi.provider.getContainerConnections();

  // keep only the podman engine
  // TODO: match by engineId from `image.engineId` instead of just looking for the first podman
  const podmanConnections = providerConnections.filter(
    providerConnection => providerConnection.connection.type === 'podman',
  );

  if (podmanConnections.length < 1) {
    throw new Error('No podman engine. Cannot preload images');
  }

  // get the running podman engine(s)
  const runningPodmanConnections = providerConnections.filter(
    providerConnection => providerConnection.connection.status() === 'started',
  );
  if (runningPodmanConnections.length < 1) {
    throw new Error('No podman engine running. Cannot preload images');
  }

  const containerConnection = runningPodmanConnections[0].connection;

  console.log('Pulling ' + bootcImageBuilderName);
  await extensionApi.containerEngine.pullImage(containerConnection, bootcImageBuilderName, () => {});
}

async function createImage(image, type, folder: string, imagePath: string) {
  // TEMPORARY UNTIL PR IS MERGED IN BOOTC-IMAGE-BUILDER
  // If type is raw, change it to ami
  if (type === 'raw') {
    type = 'ami';
  }

  console.log('Building ' + diskImageBuildingName + ' to ' + type);

  /*

// The "raw" CLI command for the below container create

podman run \
--rm \
-it \
--privileged \
--pull=newer \
--security-opt label=type:unconfined_t \
quay.io/centos-bootc/bootc-image-builder:latest \
$IMAGE
*/

  // Update options with the above values
  const Labels: { [label: string]: string } = {};
  Labels['bootc.image.builder'] = 'true';
  Labels['bootc.build.image.location'] = imagePath;
  Labels['bootc.build.type'] = type;
  const options: ContainerCreateOptions = {
    name: diskImageBuildingName,
    Image: bootcImageBuilderName,
    Tty: true,
    HostConfig: {
      Privileged: true,
      SecurityOpt: ['label=type:unconfined_t'],
      Binds: [folder + ':/tmp/'],
    },
    Labels,
    // Outputs to:
    // <type>/disk.<type>
    // in the directory provided
    Cmd: [image.name, '--type', type, '--output', '/tmp/'],
  };

  const result = await extensionApi.containerEngine.createContainer(image.engineId, options);

  // return the created container id
  return result.id;
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

export async function deactivate(): Promise<void> {
  await bootc?.deactivate();
}
