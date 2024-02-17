import * as podmanDesktopApi from '@podman-desktop/api';
import type { ImageInfo } from '@podman-desktop/api';
import { BootcApi } from '@shared/src/BootcAPI';
import { BootcBuildOptions } from '@shared/src/models/build';
import { buildDiskImage } from './build-disk-image';

export class BootcApiImpl implements BootcApi {
  async ping(): Promise<string> {
    podmanDesktopApi.window.showInformationMessage('pong');
    return 'pong';
  }

  async buildImage(build: BootcBuildOptions): Promise<void> {
    console.log('Going to build image: ', build);
    return buildDiskImage(build);
  }

  async selectOutputFolder(): Promise<string> {
    // TODO: Need to refactor this / make this a bit better?
    let path = await podmanDesktopApi.window.showOpenDialog({
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
      let retrieveImages = await podmanDesktopApi.containerEngine.listImages();
      images = retrieveImages.filter(image => {
        return image.Labels['bootc'] || image.Labels['containers.bootc'];
      });
    } catch (err) {
      podmanDesktopApi.window.showErrorMessage('Error listing images: ' + err);
      console.error('Error listing images: ' + err);
    }
    return images;
  }
}
