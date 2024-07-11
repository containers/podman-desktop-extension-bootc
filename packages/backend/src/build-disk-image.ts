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
import path, { resolve } from 'node:path';
import os from 'node:os';
import * as containerUtils from './container-utils';
import { bootcImageBuilder, bootcImageBuilderCentos, bootcImageBuilderRHEL } from './constants';
import type { BootcBuildInfo, BuildType } from '/@shared/src/models/bootc';
import type { History } from './history';
import * as machineUtils from './machine-utils';
import { getConfigurationValue, telemetryLogger } from './extension';

export async function buildExists(folder: string, types: BuildType[]) {
  let exists = false;
  types.forEach(type => {
    let imageName = ''; // Initialize imageName as an empty string
    if (type === 'qcow2') {
      imageName = 'qcow2/disk.qcow2';
    } else if (type === 'ami') {
      imageName = 'image/disk.raw';
    } else if (type === 'raw') {
      imageName = 'image/disk.raw';
    } else if (type === 'vmdk') {
      imageName = 'vmdk/disk.vmdk';
    } else if (type === 'iso') {
      imageName = 'bootiso/disk.iso';
    }

    const imagePath = resolve(folder, imageName);
    if (fs.existsSync(imagePath)) {
      exists = true;
    }
  });
  return exists;
}

export async function buildDiskImage(build: BootcBuildInfo, history: History, overwrite?: boolean): Promise<void> {
  const prereqs = await machineUtils.checkPrereqs();
  if (prereqs) {
    await extensionApi.window.showErrorMessage(prereqs);
    throw new Error(prereqs);
  }

  const requiredFields = [
    { field: 'id', message: 'Bootc image id is required.' },
    { field: 'tag', message: 'Bootc image tag is required.' },
    { field: 'type', message: 'Bootc image type is required.' },
    { field: 'engineId', message: 'Bootc image engineId is required.' },
    { field: 'folder', message: 'Bootc image folder is required.' },
    { field: 'arch', message: 'Bootc image architecture is required.' },
  ];

  // VALIDATION CHECKS
  for (const { field, message } of requiredFields) {
    if (!build[field as keyof BootcBuildInfo]) {
      await extensionApi.window.showErrorMessage(message);
      throw new Error(message);
    }
  }

  // If one of awsAmiName, awsBucket, or awsRegion is defined, all three must be defined
  if (
    (build.awsAmiName && !build.awsBucket) ??
    (!build.awsAmiName && build.awsBucket) ??
    (!build.awsAmiName && build.awsBucket && build.awsRegion)
  ) {
    const response = 'If you are using AWS, you must provide an AMI name, bucket, and region.';
    await extensionApi.window.showErrorMessage(response);
    throw new Error(response);
  }

  // Use build.type to check for existing files
  if (
    !overwrite &&
    (await buildExists(build.folder, build.type)) &&
    (await extensionApi.window.showWarningMessage('File already exists, do you want to overwrite?', 'Yes', 'No')) ===
      'No'
  ) {
    return;
  }

  // Add the 'history' information before we start the build
  // this will be improved in the future to add more information
  build.status = 'creating';
  await history.addOrUpdateBuildInfo(build);

  // Store the build information for telemetry
  const telemetryData: Record<string, unknown> = {};
  telemetryData.build = build;

  // "Returning" withProgress allows PD to handle the task in the background with building.
  let errorMessage: string;
  return extensionApi.window
    .withProgress(
      { location: extensionApi.ProgressLocation.TASK_WIDGET, title: `Building disk image ${build.image}` },
      async progress => {
        const buildContainerName = build.image.split('/').pop() + '-' + bootcImageBuilder;
        let successful: boolean = false;
        let logData: string = 'Build Image Log ----------\n';
        logData += 'ID:     ' + build.id + '\n';
        logData += 'Image:  ' + build.image + '\n';
        logData += 'Type:   ' + build.type + '\n';
        logData += 'Folder: ' + build.folder + '\n';
        logData += '----------\n';

        // Create log folder
        if (!fs.existsSync(build.folder)) {
          await fs.promises.mkdir(build.folder, { recursive: true });
        }
        const logPath = resolve(build.folder, 'image-build.log');
        if (fs.existsSync(logPath)) {
          fs.unlinkSync(logPath);
        }

        // determine which bootc image builder to use
        const builder = await getBuilder();

        // Preliminary Step 0. Create the "bootc-image-builder" container
        // options that we will use to build the image. This will help with debugging
        // as well as making sure we delete the previous build, etc.
        const containerName = await getUnusedName(buildContainerName);
        const buildImageContainer = createBuilderImageOptions(containerName, build, builder);
        logData += JSON.stringify(buildImageContainer, undefined, 2);
        logData += '\n----------\n';
        logData += createPodmanRunCommand(buildImageContainer);
        logData += '\n----------\n';
        try {
          await fs.promises.writeFile(logPath, logData);
        } catch (e) {
          console.debug('Could not write bootc build log: ', e);
        }

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
          build.status = 'running';
          await history.addOrUpdateBuildInfo(build);
          const containerId = await containerUtils.createAndStartContainer(build.engineId, buildImageContainer);

          // Update the history with the container id that was used to build the image
          build.buildContainerId = containerId;
          await history.addOrUpdateBuildInfo(build);

          // Step 3.1 Since we have started the container, we can now go get the logs
          await logContainer(build.engineId, containerId, progress, data => {
            // update the log file asyncronously
            fs.promises.appendFile(logPath, data).catch((error: unknown) => {
              console.debug('Could not write bootc build log: ', error);
            });
          });

          // Step 4. Wait for the container to exit
          // This function will ensure it exits with a zero exit code
          // if it does not, it will error out.
          progress.report({ increment: 7 });

          try {
            await containerUtils.waitForContainerToExit(containerId);
          } catch (error) {
            // If we error out, BUT the container does not exist in the history, we will silently error
            // as it's possible that the container was removed by the user during the build cycle / deleted from history.

            // Check if history has an entry with a containerId
            const historyExists = history.getHistory().some(info => info.buildContainerId === containerId);
            if (!historyExists) {
              console.error(
                `Container ${build.buildContainerId} for build ${build.image}:${build.arch} has errored out, but there is no container history. This is likely due to the container being removed intentionally during the build cycle. Ignore this. Error: ${error}`,
              );
              return;
            } else {
              throw error;
            }
          }

          // If we get here, the container has exited with a zero exit code
          // it's successful as well so we will write the log file
          successful = true;
          telemetryData.success = true;
        } catch (error: unknown) {
          errorMessage = (error as Error).message;
          console.error(error);
          telemetryData.error = error;
        } finally {
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
        progress.report({ increment: 100 });
        telemetryLogger.logUsage('buildDiskImage', telemetryData);

        try {
          // Update the image build status
          build.status = successful ? 'success' : 'error';
          await history.addOrUpdateBuildInfo(build);
        } catch (e) {
          // If for any reason there is an error.. (example, unable to write to history file)
          // we do not want to stop the notification to the user, so
          // just output this to console and continue.
          console.error('Error updating image build status', e);
        }
        if (!successful) {
          if (!errorMessage.endsWith('.')) {
            errorMessage += '.';
          }
          throw new Error(errorMessage);
        }
      },
    )
    .then(async () => {
      if (build.status === 'success') {
        // Notify the user that the image has been built successfully
        await extensionApi.window.showInformationMessage(
          `Success! A disk image derived from your bootable container has been succesfully created in ${build.folder}`,
          'OK',
        );
      } else {
        // Notify on an error
        const logPath = resolve(build.folder, 'image-build.log');
        await extensionApi.window.showErrorMessage(
          `There was an error building the image: ${errorMessage} Check logs at ${logPath}`,
          'OK',
        );
      }
    });
}

async function logContainer(
  engineId: string,
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

export async function getBuilder(): Promise<string> {
  // use the preference to decide which builder to use
  const buildProp = await getConfigurationValue<string>('builder');

  if (buildProp === 'RHEL') {
    return bootcImageBuilderRHEL;
  }

  // always default to centos bib
  return bootcImageBuilderCentos;
}

// Create builder options for the "bootc-image-builder" container
export function createBuilderImageOptions(
  name: string,
  build: BootcBuildInfo,
  builder?: string,
): ContainerCreateOptions {
  const cmd = [`${build.image}:${build.tag}`, '--output', '/output/', '--local'];

  build.type.forEach(t => cmd.push('--type', t));

  if (build.arch) {
    cmd.push('--target-arch', build.arch);
  }

  // If the filesystem is specified, add it to the command
  // the only available options are 'ext4' and 'xfs', check that filesystem is not undefined and is one of the two options
  if (build.filesystem && (build.filesystem === 'ext4' || build.filesystem === 'xfs')) {
    cmd.push('--rootfs', build.filesystem);
  }

  // Create the image options for the "bootc-image-builder" container
  const options: ContainerCreateOptions = {
    name: name,
    Image: builder ?? bootcImageBuilderCentos,
    Tty: true,
    HostConfig: {
      Privileged: true,
      SecurityOpt: ['label=type:unconfined_t'],
      Binds: [build.folder + ':/output/', '/var/lib/containers/storage:/var/lib/containers/storage'],
    },

    // Add the appropriate labels for it to appear correctly in the Podman Desktop UI.
    Labels: {
      'bootc.image.builder': 'true',
    },
    Cmd: cmd,
  };

  // If awsAmiName, awsBucket, and awsRegion are defined. We will add the mounted volume
  // of the OS homedir & the .aws directory to the container.
  if (build.awsAmiName && build.awsBucket && build.awsRegion) {
    // Add the commands to the container, --aws-ami-name, --aws-bucket, --aws-region
    cmd.push('--aws-ami-name', build.awsAmiName, '--aws-bucket', build.awsBucket, '--aws-region', build.awsRegion);

    if (options.HostConfig?.Binds) {
      options?.HostConfig?.Binds.push(path.join(os.homedir(), '.aws') + ':/root/.aws:ro');
    }
  }

  return options;
}

export function createPodmanRunCommand(options: ContainerCreateOptions): string {
  let command = 'podman run \\';

  if (options.name) {
    command += `\n  --name ${options.name} \\`;
  }

  if (options.Tty) {
    command += `\n  --tty \\`;
  }

  if (options.HostConfig?.Privileged) {
    command += `\n  --privileged \\`;
  }

  if (options.HostConfig?.SecurityOpt) {
    options.HostConfig.SecurityOpt.forEach(opt => {
      command += `\n  --security-opt ${opt} \\`;
    });
  }

  if (options.HostConfig?.Binds) {
    options.HostConfig.Binds.forEach(bind => {
      command += `\n  -v ${bind} \\`;
    });
  }

  if (options.Labels) {
    for (const [key, value] of Object.entries(options.Labels)) {
      command += `\n  --label ${key}=${value} \\`;
    }
  }

  if (options.Image) {
    command += `\n  ${options.Image} \\`;
  }

  if (options.Cmd) {
    options.Cmd.forEach(cmd => {
      command += `\n  ${cmd} \\`;
    });
  }

  // Remove the trailing backslash
  if (command.endsWith(' \\')) {
    command = command.slice(0, -2);
  }

  return command;
}
