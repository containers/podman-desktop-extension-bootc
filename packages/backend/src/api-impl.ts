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
import type { BootcBuildInfo, BuildType } from '/@shared/src/models/bootc';
import { buildDiskImage, buildExists } from './build-disk-image';
import { History } from './history';
import * as containerUtils from './container-utils';
import { Messages } from '/@shared/src/messages/Messages';
import { telemetryLogger } from './extension';
import { checkPrereqs } from './machine-utils';

export class BootcApiImpl implements BootcApi {
  private history: History;
  private webview: podmanDesktopApi.Webview;

  constructor(
    private readonly extensionContext: podmanDesktopApi.ExtensionContext,
    webview: podmanDesktopApi.Webview,
  ) {
    this.history = new History(extensionContext.storagePath);
    this.webview = webview;
  }

  async checkPrereqs(): Promise<string | undefined> {
    return checkPrereqs();
  }

  async buildExists(folder: string, types: BuildType[]): Promise<boolean> {
    return buildExists(folder, types);
  }

  async buildImage(build: BootcBuildInfo, overwrite?: boolean): Promise<void> {
    return buildDiskImage(build, this.history, overwrite);
  }

  async deleteBuilds(builds: BootcBuildInfo[]): Promise<void> {
    const response = await podmanDesktopApi.window.showWarningMessage(
      `Are you sure you want to remove the selected disk images from the build history? This will remove the history of the build as well as remove any lingering build containers.`,
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

  async openFolder(folder: string): Promise<boolean> {
    return await podmanDesktopApi.env.openExternal(podmanDesktopApi.Uri.file(folder));
  }

  async openLink(link: string): Promise<void> {
    await podmanDesktopApi.env.openExternal(podmanDesktopApi.Uri.parse(link));
  }

  async generateUniqueBuildID(name: string): Promise<string> {
    return this.history.getUnusedHistoryName(name);
  }

  // Pull an image from the registry
  async pullImage(imageName: string): Promise<void> {
    let success: boolean = false;
    let error: string = '';
    try {
      await containerUtils.pullImage(imageName);
      success = true;
    } catch (err) {
      await podmanDesktopApi.window.showErrorMessage(`Error pulling image: ${err}`);
      console.error('Error pulling image: ', err);
      error = String(err);
    } finally {
      // Notify the frontend if the pull was successful, and if there was an error.
      await this.notify(Messages.MSG_IMAGE_PULL_UPDATE, { image: imageName, success, error });
    }
  }

  // Log an event to telemetry
  async telemetryLogUsage(eventName: string, data?: Record<string, unknown>): Promise<void> {
    telemetryLogger.logUsage(eventName, data);
  }

  // Log an error to telemetry
  async telemetryLogError(eventName: string, data?: Record<string, unknown>): Promise<void> {
    telemetryLogger.logError(eventName, data);
  }

  // The API does not allow callbacks through the RPC, so instead
  // we send "notify" messages to the frontend to trigger a refresh
  // this method is internal and meant to be used by the API implementation
  protected async notify(msg: string, body?: unknown): Promise<void> {
    await this.webview.postMessage({
      id: msg,
      // Must pass in an empty body to satisfy the type system, if it is undefined, this fails.
      body: body ?? '',
    });
  }
}
