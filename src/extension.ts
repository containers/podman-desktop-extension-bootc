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
      if (!selectedType)
        return;

      const selectedFolder = await extensionApi.window.showInputBox({
        prompt: 'Select the folder to generate disk' + selectedType + ' into',
        value: os.homedir(),
        ignoreFocusOut: true,
      });
      if (!selectedFolder)
        return;

      // TODO: check if file exists and warn or error out

      return extensionApi.window.withProgress(
        { location: extensionApi.ProgressLocation.TASK_WIDGET, title: 'Building disk image ' + image.name },
        async progress => {

          // ignore everything before last /
          // we will use this as the "build" container name
          diskImageBuildingName = image.name.split('/').pop() + bootcImageBuilderContainerName,

          // TODO: Make sure that 'image' has been pushed to registry before building it..
          // or else it will fail.
          // for demo right now, don't bother checking

          await pullBootcImageBuilderImage();
          progress.report({ increment: 10 });
          await removePreviousBuildImage(image);
          progress.report({ increment: 15 });
          let containerId = await createImage(image, selectedType, selectedFolder);

          logContainer(image, containerId, progress);

          // TODO:
          // Wait until container has stopped
          // then delete container

          // Mark the task as completed
          progress.report({ increment: -1 });
        },
      );
    }),
  );
}

async function removePreviousBuildImage(image) {
  // Ignore if the container doesn't exist
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
    let containerConnection = podmanConnection[0].connection;

  console.log('Pulling ' + bootcImageBuilderName);

  try {
    await extensionApi.containerEngine.pullImage(containerConnection, bootcImageBuilderName, () =>
      console.log("Bootc builder image pulled"),
    );
  } catch (e) {
    console.log(e);
  }
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
let options: ContainerCreateOptions = {
  name: diskImageBuildingName,
  Image: bootcImageBuilderName,
  Tty: true,
  HostConfig: {
    Privileged: true,
    SecurityOpt: ['label=type:unconfined_t'],
    Binds: [folder + ':/tmp/' + type]
  },
  // Outputs to:
  // <type>/disk.<type>
  // in the directory provided
  Cmd: [image.name,"--type", type, "--output","/tmp/" + type],
};
try {
  let result = await extensionApi.containerEngine.createContainer(image.engineId, options);
  return result.id;
} catch (e) {
  console.log(e);
}
}

async function logContainer(image, containerId: string, progress): Promise<void> {
  try {
    await extensionApi.containerEngine.logsContainer(
        image.engineId,
        containerId,
        (_name: string, data: string) => {
          if (data) {
            if (data.includes('org.osbuild.rpm'))
              progress.report({ increment: 40 });
            else if (data.includes('org.osbuild.selinux'))
              progress.report({ increment: 60 });
            else if (data.includes('org.osbuild.deploy.container'))
              progress.report({ increment: 80 });
            else if (data.includes('org.osbuild.copy'))
              progress.report({ increment: 90 });
          }
        }
      );
  } catch (err) {
    console.error(err);
    // propagate the error
    throw err;
  }
}
export async function deactivate(): Promise<void> {
  await bootc?.deactivate();
}
