import * as podmanDesktopApi from '@podman-desktop/api';
import type { ImageInfo } from '@podman-desktop/api';
import type { BootcApi } from '@shared/src/BootcAPI';
import type { BootcBuildOptions, BootcHistoryInfo } from '@shared/src/models/bootc';
import { buildDiskImage } from './build-disk-image';
import { History } from './history';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as containerUtils from './container-utils';

export class BootcApiImpl implements BootcApi {
  private history: History;

  constructor(private readonly extensionContext: podmanDesktopApi.ExtensionContext) {
    this.history = new History(extensionContext.storagePath);
  }

  async ping(): Promise<string> {
    return podmanDesktopApi.window.showInformationMessage('pong');
  }

  async buildImage(build: BootcBuildOptions): Promise<void> {
    console.log('Going to build image: ', build);
    return buildDiskImage(build, this.history);
  }

  // Read the image-log file from the build folder and return the content
  // use node:fs
  async getBuildLog(folder: string): Promise<string> {
    try {
      const logFile = await readFile(path.join(folder, 'image-build.log'), 'utf8');
      console.log('This is the log file:', logFile);
      return logFile;
    } catch (err) {
      await podmanDesktopApi.window.showErrorMessage('Error reading log file: ' + err);
      console.error('Error reading log file: ', err);
    }
  }

  async selectOutputFolder(): Promise<string> {
    // TODO: Need to refactor this / make this a bit better?
    const path = await podmanDesktopApi.window.showOpenDialog({
      title: 'Select output folder',
      selectors: ['openDirectory'],
    });
    if (path.length > 0) {
      return path[0].fsPath;
    }
  }

  async listBootcImages(): Promise<ImageInfo[]> {
    let images: ImageInfo[];
    try {
      const retrieveImages = await podmanDesktopApi.containerEngine.listImages();
      images = retrieveImages.filter(image => {
        if (image.Labels) {
          return image.Labels['bootc'] || image.Labels['containers.bootc'];
        }
      });
    } catch (err) {
      await podmanDesktopApi.window.showErrorMessage('Error listing images: ' + err);
      console.error('Error listing images: ', err);
    }
    return images;
  }

  async listHistoryInfo(): Promise<BootcHistoryInfo[]> {
    try {
      await this.history.loadFile();
    } catch (err) {
      await podmanDesktopApi.window.showErrorMessage(
        `Error loading history from ${this.extensionContext.storagePath}, error: ${err}`,
      );
      console.error('Error loading history: ', err);
    }
    console.log('history infos from ', this.extensionContext.storagePath, this.history.infos);
    return this.history.infos;
  }

  async deleteBuild(image: string, tag: string, type: string, arch: string, containerId: string): Promise<void> {
    // Before removing the image from the history, confirm it's usage
    // we use showWarningMessage here instead of svelte, as it's only accessible through the API.
    const response = await podmanDesktopApi.window.showWarningMessage(
      `Are you sure you want to remove the image ${image} from the build history? This will remove the history of the build as well as remove any lingering build container.`,
      'Yes',
      'No',
    );
    if (response === 'Yes') {
      // Container cleanup
      const containers = await podmanDesktopApi.containerEngine.listContainers();
      const container = containers.find(c => c.Id === containerId);

      // If we found the container, clean it up
      if (container) {
        // TODO: refactor removeContainerAndVolumes to use container id instead of "names"
        const containerName = container.Names[0].replace('/', '');
        // Update status to 'deleting'
        await this.history.updateImageBuildStatus(image, tag, type, arch, 'deleting');
        await containerUtils.removeContainerAndVolumes(container.engineId, containerName);
      }

      await this.history.removeImageBuild(image, tag, type, arch);
    }
  }

  async navigateToContainerLogs(containerId: string): Promise<void> {
    return await podmanDesktopApi.navigation.navigateToContainerLogs(containerId);
  }

  async recoverLostBuilds(): Promise<void> {
    return await this.history.recoverLostBuilds();
  }

  async deleteAll(): Promise<void> {
    const response = await podmanDesktopApi.window.showWarningMessage(
      'Are you sure you want to prune the entire build history and all associated containers? This action cannot be undone.',
      'Yes',
      'No',
    );
    if (response === 'Yes') {
      // Container cleanup
      const containers = await podmanDesktopApi.containerEngine.listContainers();

      // Go through each history entry, remove the container if it exists and then delete the history entry
      for (const historyInfo of this.history.infos) {
        const container = containers.find(c => c.Id === historyInfo.buildContainerId);

        // If we found the container, clean it up
        if (container) {
          // TODO: refactor removeContainerAndVolumes to use container id instead of "names"
          const containerName = container.Names[0].replace('/', '');
          // Update status to 'deleting'
          await this.history.updateImageBuildStatus(
            historyInfo.image,
            historyInfo.tag,
            historyInfo.type,
            historyInfo.arch,
            'deleting',
          );
          await containerUtils.removeContainerAndVolumes(container.engineId, containerName);
        }

        await this.history.removeImageBuild(historyInfo.image, historyInfo.tag, historyInfo.type, historyInfo.arch);
      }
    }
  }
}
