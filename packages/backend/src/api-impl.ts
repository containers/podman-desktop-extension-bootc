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

import * as podmanDesktopApi from '@podman-desktop/api';
import type { ImageInfo } from '@podman-desktop/api';
import type { BootcApi } from '/@shared/src/BootcAPI';
import { BOOTC_BUILD_LOG_FILENAME, type BootcBuildInfo } from '/@shared/src/models/bootc';
import { buildDiskImage } from './build-disk-image';
import { History } from './history';
import * as containerUtils from './container-utils';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as fs from 'node:fs';

export class BootcApiImpl implements BootcApi {
  private history: History;

  constructor(private readonly extensionContext: podmanDesktopApi.ExtensionContext) {
    this.history = new History(extensionContext.storagePath);
  }

  async buildImage(build: BootcBuildInfo): Promise<void> {
    return buildDiskImage(build, this.history);
  }

  async deleteBuild(build: BootcBuildInfo): Promise<void> {
    // Before removing the image from the history, confirm it's usage
    // we use showWarningMessage here instead of svelte, as it's only accessible through the API.
    const response = await podmanDesktopApi.window.showWarningMessage(
      `Are you sure you want to remove the image ${build.name} from the build history? This will remove the history of the build as well as remove any lingering build container.`,
      'Yes',
      'No',
    );
    if (response === 'Yes') {
      await this.deleteBuildContainer(build);
    }
  }

  async deleteBuilds(builds: BootcBuildInfo[]): Promise<void> {
    const response = await podmanDesktopApi.window.showWarningMessage(
      `Are you sure you want to remove the selected images from the build history? This will remove the history of the build as well as remove any lingering build containers.`,
      'Yes',
      'No',
    );
    if (response === 'Yes') {
      // Map each build to a delete operation promise
      const deletePromises = builds.map(build => this.deleteBuildContainer(build));

      try {
        await Promise.all(deletePromises);
      } catch (error) {
        await podmanDesktopApi.window.showErrorMessage(`An error occurred while deleting build: ${error}`);
        console.error('An error occurred while deleting build:', error);
      }
    }
  }

  protected async deleteBuildContainer(build: BootcBuildInfo): Promise<void> {
    // Update status to 'deleting'
    await this.history.addOrUpdateBuildInfo({ ...build, status: 'deleting' });

    const containers = await podmanDesktopApi.containerEngine.listContainers();
    const container = containers.find(c => c.Id === build.buildContainerId);

    // If we found the container, clean it up
    if (container) {
      const containerName = container.Names[0].replace('/', '');
      await containerUtils.removeContainerAndVolumes(container.engineId, containerName);
    }

    await this.history.removeBuildInfo(build);
  }

  async selectOutputFolder(): Promise<string> {
    const path = await podmanDesktopApi.window.showOpenDialog({
      title: 'Select output folder',
      selectors: ['openDirectory'],
    });
    if (path && path.length > 0) {
      return path[0].fsPath;
    }
    return '';
  }

  async listBootcImages(): Promise<ImageInfo[]> {
    let images: ImageInfo[] = [];
    try {
      const retrieveImages = await podmanDesktopApi.containerEngine.listImages();
      images = retrieveImages.filter(image => {
        if (image.Labels) {
          return image.Labels['bootc'] ?? image.Labels['containers.bootc'];
        }
      });
    } catch (err) {
      await podmanDesktopApi.window.showErrorMessage(`Error listing images: ${err}`);
      console.error('Error listing images: ', err);
    }
    return images;
  }

  async listHistoryInfo(): Promise<BootcBuildInfo[]> {
    try {
      // Load the file so it retrieves the latest information.
      await this.history.loadFile();
    } catch (err) {
      await podmanDesktopApi.window.showErrorMessage(
        `Error loading history from ${this.extensionContext.storagePath}, error: ${err}`,
      );
      console.error('Error loading history: ', err);
    }
    return this.history.getHistory();
  }

  async navigateToContainerLogs(containerId: string): Promise<void> {
    return await podmanDesktopApi.navigation.navigateToContainerLogs(containerId);
  }

  // Read the image-log file from the build folder and return the content
  async getBuildLog(folder: string): Promise<string> {
    try {
      // If the file does not exist, error out
      if (!fs.existsSync(path.join(folder, BOOTC_BUILD_LOG_FILENAME))) {
        await podmanDesktopApi.window.showErrorMessage(
          `Log file does not exist at ${folder}/${BOOTC_BUILD_LOG_FILENAME}`,
        );
        console.error(`Log file does not exist at ${folder}/${BOOTC_BUILD_LOG_FILENAME}`);
      }

      return await readFile(path.join(folder, BOOTC_BUILD_LOG_FILENAME), 'utf8');
    } catch (err) {
      await podmanDesktopApi.window.showErrorMessage(`Error reading log file: ${err}`);
      console.error('Error reading log file: ', err);
    }
    return '';
  }

  async openFolder(folder: string): Promise<boolean> {
    return await podmanDesktopApi.env.openExternal(podmanDesktopApi.Uri.file(folder));
  }
}
