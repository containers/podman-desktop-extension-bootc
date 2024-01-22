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

// Get the running container engine
export async function getContainerEngine(): Promise<extensionApi.ContainerProviderConnection> {
  // Get all engines
  const providerConnections = extensionApi.provider.getContainerConnections();

  // Keep only the podman engine
  // TODO: match by engineId from `image.engineId` instead of just looking for the first podman
  const podmanConnections = providerConnections.filter(
    providerConnection => providerConnection.connection.type === 'podman',
  );

  if (podmanConnections.length < 1) {
    throw new Error('No podman engine. Cannot preload images');
  }

  // Get the running podman engine(s)
  const runningPodmanConnections = providerConnections.filter(
    providerConnection => providerConnection.connection.status() === 'started',
  );
  if (runningPodmanConnections.length < 1) {
    throw new Error('No podman engine running. Cannot preload images');
  }

  return runningPodmanConnections[0].connection;
}

// Pull the image
export async function pullImage(image: string) {
  console.log('Pulling image: ', image);
  try {
    const containerConnection = await getContainerEngine();
    await extensionApi.containerEngine.pullImage(containerConnection, image, () => {});
  } catch (e) {
    console.log(e);
    throw new Error('There was an error pulling the image: ' + e);
  }
}

// Create and start a container based upon the container create options
// For functions such as start / stop / delete, we need the engineID passed in..
export async function createAndStartContainer(engineId: string, options: ContainerCreateOptions): Promise<string> {
  console.log('engineID: ', engineId);
  try {
    const result = await extensionApi.containerEngine.createContainer(engineId, options);
    return result.id;
  } catch (e) {
    console.log(e);
    throw new Error('There was an error creating the container: ' + e);
  }
}
/*
Wait for the container to exit, if it exits with a non-zero exit code, throw an error
TODO: Add timeout?
*/
export async function waitForContainerToExit(containerId: string): Promise<void> {
  let containerRunning = true;

  while (containerRunning) {
    console.log('Waiting for container to exit: ', containerId);
    await extensionApi.containerEngine.listContainers().then(containers => {
      containers.forEach(container => {
        if (container.Id === containerId && container.State === 'exited') {
          // Let's stop the loop if the container has exited / stopped
          containerRunning = false;
          // Container.status reports "ex. Exited (1) Less than a second ago" when it
          // errors out, and Exited (0) when it succeeds. So we check for that.
          if (!container.Status.includes('Exited (0)')) {
            throw new Error('There was an error with the build, the container exited with a non-zero exit code.');
          }
        }
      });
    });

    // Check every second
    await new Promise(r => setTimeout(r, 1000));
  }
}

// List containers, find the container by name if it exists, and then delete it.
export async function removeContainerIfExists(engineId: string, container: string) {
  try {
    // List all the containers and check to see  if it exists
    const containers = await extensionApi.containerEngine.listContainers();
    console.log('Containers: ', containers);

    // Find the one that matches the name we are looking for
    // The PD API is a bit weird in that it uses 'Names' for the container name instead of
    // Name and it's an array of strings with '/' appended to the beginning
    // So we need to check for that as well.
    let containerExists = false;
    containers.forEach(c => {
      if (c.Names.includes('/' + container)) {
        containerExists = true;
      }
    });

    // Delete the container if it exists
    if (containerExists) {
      await extensionApi.containerEngine.deleteContainer(engineId, container);
    }
  } catch (e) {
    console.log(e);
    throw new Error('There was an error removing the container: ' + e);
  }
}
