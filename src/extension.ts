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
const bootcImageBuilderName = 'quay.io/centos-bootc/bootc-image-builder';
let diskImageBuildingName: string;

export async function activate(extensionContext: ExtensionContext): Promise<void> {
  bootc = new BootC(extensionContext);
  await bootc?.activate();

  extensionContext.subscriptions.push(
    extensionApi.commands.registerCommand('bootc.image.build', async image => {
      const selectedType = await extensionApi.window.showQuickPick(['qcow2', 'ami', 'iso'], {
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

      // check if the file already exists and warn the user
      const imagePath = resolve(selectedFolder, selectedType, 'disk.' + selectedType);
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
          // ignore everything before last /
          // we will use this as the "build" container name
          diskImageBuildingName = image.name.split('/').pop() + bootcImageBuilderContainerName;

          // TODO: Make sure that 'image' has been pushed to registry before building it..
          // or else it will fail.
          // for demo right now, don't bother checking

          const logPath = resolve(selectedFolder, selectedType, 'image-build.log');
          await fs.unlink(logPath);

          try {
            await pullBootcImageBuilderImage();
            progress.report({ increment: 4 });

            await removePreviousBuildImage(image);
            progress.report({ increment: 5 });

            const containerId = await createImage(image, selectedType, selectedFolder);
            progress.report({ increment: 6 });

            let logData: string;
            await logContainer(image, containerId, progress, (data) => {logData += data });

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

            fs.writeFileSync(logPath, logData, {flag: 'w'});
          } catch (error) {
            console.error(error);
            await extensionApi.window.showErrorMessage(`Unable to build disk image: ${error}. Check logs at ${logPath}`);
          }
          // Mark the task as completed
          progress.report({ increment: -1 });
        },
      );
    }),
  );
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
  const podmanConnection = providerConnections.filter(
    providerConnection => providerConnection.connection.type === 'podman',
  );

  // engine running
  if (podmanConnection.length < 1) {
    throw new Error('No podman engine running. Cannot preload images');
  }

  // get the podman engine
  const containerConnection = podmanConnection[0].connection;

  console.log('Pulling ' + bootcImageBuilderName);
  await extensionApi.containerEngine.pullImage(containerConnection, bootcImageBuilderName, () => {});
}

async function createImage(image, type, folder: string) {
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
  const options: ContainerCreateOptions = {
    name: diskImageBuildingName,
    Image: bootcImageBuilderName,
    Tty: true,
    HostConfig: {
      Privileged: true,
      SecurityOpt: ['label=type:unconfined_t'],
      Binds: [folder + ':/tmp/' + type],
    },
    Labels,
    // Outputs to:
    // <type>/disk.<type>
    // in the directory provided
    Cmd: [image.name, '--type', type, '--output', '/tmp/' + type],
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
