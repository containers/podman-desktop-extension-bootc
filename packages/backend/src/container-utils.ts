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
import { getConfigurationValue, telemetryLogger } from './extension';

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

// Inspect the image / get more information
export async function inspectImage(engineId: string, image: string): Promise<extensionApi.ImageInspectInfo> {
  console.log('Inspecting image: ', image);
  try {
    return await extensionApi.containerEngine.getImageInspect(engineId, image);
  } catch (e) {
    console.error(e);
    throw new Error('There was an error inspecting the image: ' + e);
  }
}

// Pull the image
export async function pullImage(image: string) {
  const telemetryData: Record<string, unknown> = {};
  telemetryData.image = image;

  console.log('Pulling image: ', image);
  try {
    const containerConnection = await getContainerEngine();
    await extensionApi.containerEngine.pullImage(containerConnection, image, () => {});
    telemetryData.success = true;
  } catch (e) {
    console.error(e);
    telemetryData.error = e;
    throw new Error('There was an error pulling the image: ' + e);
  } finally {
    telemetryLogger.logUsage('pullImage', telemetryData);
  }
}

// Delete all copies of the given image except for the current one
export async function deleteOldImages(engineId: string, currentImage: string) {
  console.log('Deleting old images: ', currentImage);
  try {
    // List all the images and check to see if it exists
    const images = await extensionApi.containerEngine.listImages();
    if (!images || images.length === 0) {
      return;
    }

    // We're looking to delete images that have the same name but different tags
    const indexTag = currentImage.lastIndexOf(':');
    const currentName = currentImage.slice(0, indexTag);
    const currentTag = currentImage.slice(indexTag + 1);

    // Build a list of images by scanning all images that have the same name,
    // but do not have the current tag or other tags.
    const imageIdsToRemove: string[] = [];
    images.forEach(image => {
      if (image.engineId === engineId && image.RepoTags) {
        let found = false;
        let otherTags = false;
        image.RepoTags.map(repoTag => {
          const indexTag = repoTag.lastIndexOf(':');
          const name = repoTag.slice(0, indexTag);
          const tag = repoTag.slice(indexTag + 1);
          if (name === currentName) {
            if (tag !== currentTag) {
              found = true;
            } else {
              otherTags = true;
            }
          } else {
            otherTags = true;
          }
        });
        if (found && !otherTags) {
          imageIdsToRemove.push(image.Id);
        }
      }
    });

    // Delete the images
    await imageIdsToRemove.reduce((prev: Promise<void>, imageId) => {
      return prev
        .then(() => extensionApi.containerEngine.deleteImage(engineId, imageId))
        .catch((e: unknown) => console.error('error while removing image', e));
    }, Promise.resolve());
  } catch (e) {
    console.error(e);
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
    console.error(e);
    throw new Error('There was an error creating the container: ' + e);
  }
}

export async function waitForContainerToExit(containerId: string, maxRetryCount: number = 5): Promise<void> {
  let retryCount = 0;
  let containerRunning = true;
  const timeoutMinutes = (await getConfigurationValue<number>('build.timeout')) ?? 60;
  const timeout = timeoutMinutes * 60 * 1000; // change to minutes

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${timeoutMinutes} minutes`)), timeout),
  );

  while (containerRunning) {
    console.log('Waiting for container to exit: ', containerId);

    await Promise.race([
      (async () => {
        const containers = await extensionApi.containerEngine.listContainers();
        let containerFound = false;

        containers.forEach(container => {
          if (container.Id === containerId) {
            containerFound = true;
            if (container.State === 'exited') {
              // Stop the loop if the container has exited/stopped
              containerRunning = false;
              // Check for non-zero exit code
              if (!container.Status.includes('Exited (0)')) {
                throw new Error('Container exited with a non-zero exit code.');
              }
            }
          }
        });

        // Retry in case the container has been lost for any reason, such as the engine being restarted / network issues, etc.
        // container being recreated.
        if (!containerFound) {
          retryCount++;
          if (retryCount >= maxRetryCount) {
            throw new Error('Container not found after maximum retries.');
          }
          // If container not found, wait a bit before retrying
          console.log(`Container ${containerId} not found, retrying... (${retryCount}/${maxRetryCount})`);
          await new Promise(r => setTimeout(r, 1000));
        }
      })(),
      timeoutPromise,
    ]).catch((error: unknown) => {
      // Handle both timeout and other errors
      containerRunning = false; // Stop trying to wait for the container
      throw error;
    });

    if (containerRunning) {
      // If still running and not timed out or hit max retries, check again after 1 second
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// List containers, find the container by name if it exists, and then delete it.
export async function removeContainerIfExists(engineId: string, container: string) {
  try {
    // List all the containers and check to see  if it exists
    const containers = await extensionApi.containerEngine.listContainers();

    // Find the one that matches the name we are looking for
    // The PD API is a bit weird in that it uses 'Names' for the container name instead of
    // Name and it's an array of strings with '/' appended to the beginning
    // So we need to check for that as well.
    let containerExists = false;

    // Only check for the container if there are containers
    if (containers && containers.length > 0) {
      containers.forEach(c => {
        if (c.Names.includes('/' + container)) {
          containerExists = true;
        }
      });
    }

    // Delete the container if it exists
    if (containerExists) {
      await extensionApi.containerEngine.deleteContainer(engineId, container);
    }
  } catch (e) {
    console.error(e);
    throw new Error('There was an error removing the container: ' + e);
  }
}

// Get all volume names that match the name of the container
async function getVolumesMatchingContainer(engineId: string, container: string): Promise<string[]> {
  try {
    // Volumes returns a list of volumes across all engines. Only get the volume that matches our engineId
    const engineVolumes = await extensionApi.containerEngine.listVolumes();
    if (!engineVolumes) {
      throw new Error('No providers containing volumes found');
    }
    // If none are found, just return an empty array / small warning
    const volumes = engineVolumes.find(volume => volume.engineId === engineId);
    if (!volumes) {
      console.log('Ignoring removing volumes, no volumes found for engineId: ', engineId);
      return [];
    }

    // Go through each volume and only retrieve the ones that match our container
    // "Names" in the API weirdly has `/` appended to the beginning of the name due to how it models the podman API
    // so we have to make sure / is appended to the container name for comparison..
    let volumeNames: string[] = [];
    volumes.Volumes.forEach(v => {
      v.containersUsage.forEach(c => {
        c.names.forEach(n => {
          if (n === '/' + container) {
            volumeNames.push(v.Name);
          }
        });
      });
    });

    // Remove any duplicates that may have been added (same volume used multiple times / mounted).
    volumeNames = [...new Set(volumeNames)];
    return volumeNames;
  } catch (e) {
    console.error(e);
    throw new Error('There was an error getting the volumes: ' + e);
  }
}

// Remove the container and volumes
export async function removeContainerAndVolumes(engineId: string, container: string) {
  try {
    // Due to limitations of the API, we must use listVolumes to get the list of volumes before
    // we delete the container or else the "lingering" volumes will have no container information
    // associated to them.

    // If we are unable to get the containers, we should still try to delete the container, so we ignore the error
    // and just log the error.
    let volumeNames: string[] = [];
    try {
      volumeNames = await getVolumesMatchingContainer(engineId, container);
      console.log('Matching volumes: ', volumeNames);
    } catch (e) {
      console.warn(
        'Unable to get volumes matching container: ',
        e,
        ' However, we will still try to delete the container',
      );
    }

    // Delete the container (must be done before deleting the volumes)
    console.log('Cleanup: Removing container: ', container);
    await removeContainerIfExists(engineId, container);

    // Delete volume requires a container engine connection, so we need to get that again
    const containerConnection = await getContainerEngine();

    // For loop through it all so we don't have to use a promise / it is deleted correctly.
    for (const name of volumeNames) {
      console.log('Cleanup: Removing volume: ', name);
      await extensionApi.containerEngine.deleteVolume(name, { provider: containerConnection });
    }
  } catch (e) {
    console.error(e);
    throw new Error('There was an error removing the container and volumes: ' + e);
  }
}
