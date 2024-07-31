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

import type { Page } from '@playwright/test';
import { afterAll, beforeAll, test, describe, beforeEach } from 'vitest';
import {
  NavigationBar,
  PodmanDesktopRunner,
  WelcomePage,
  deleteImage,
  removeFolderIfExists,
  waitForPodmanMachineStartup,
} from '@podman-desktop/tests-playwright';
import { expect as playExpect } from '@playwright/test';
import { RunnerTestContext } from '@podman-desktop/tests-playwright';
import * as path from 'node:path';
import * as os from 'node:os';
import { BootcPage } from './model/bootc-page';
import { ArchitectureType } from '@podman-desktop/tests-playwright';

let pdRunner: PodmanDesktopRunner;
let page: Page;
let webview: Page;
let navBar: NavigationBar;
let extensionInstalled = false;
const imageName = 'quay.io/centos-bootc/centos-bootc';
const imageTag = 'stream9';
const extensionName = 'bootc';
const extensionLabel = 'redhat.bootc';
const extensionHeading = 'Bootable Container';
const isLinux = os.platform() === 'linux';
const isWindows = os.platform() === 'win32';
const containerFilePath = path.resolve(__dirname, '..', 'resources', 'bootable-containerfile');
const contextDirectory = path.resolve(__dirname, '..', 'resources');
const skipInstallation = process.env.SKIP_INSTALLATION;
const buildISOImage = process.env.BUILD_ISO_IMAGE;
let timeoutForBuild = 900000;
let imageBuildFailed = true;

beforeEach<RunnerTestContext>(async ctx => {
  ctx.pdRunner = pdRunner;
});

beforeAll(async () => {
  await removeFolderIfExists('tests/output/images');
  pdRunner = new PodmanDesktopRunner({ customFolder: 'bootc-tests-pd', autoUpdate: false, autoCheckUpdate: false });
  page = await pdRunner.start();
  pdRunner.setVideoAndTraceName('bootc-e2e');

  const welcomePage = new WelcomePage(page);
  await welcomePage.handleWelcomePage(true);
  navBar = new NavigationBar(page);
  await waitForPodmanMachineStartup(page);
});

afterAll(async () => {
  try {
    await deleteImage(page, imageName);
  } catch (error) {
    console.log(`Error deleting image: ${error}`);
  } finally {
    await removeFolderIfExists('tests/output/images');
    await pdRunner.close();
  }
}, 180000);

describe('BootC Extension', async () => {
  test('Go to settings and check if extension is already installed', async () => {
    const extensionsPage = await navBar.openExtensions();
    if (await extensionsPage.extensionIsInstalled(extensionLabel)) extensionInstalled = true;
  });

  test.runIf(extensionInstalled && !skipInstallation)(
    'Uninstalled previous version of bootc extension',
    async () => {
      console.log('Extension found already installed, trying to remove!');
      await ensureBootcIsRemoved();
    },
    200000,
  );

  test.runIf(!skipInstallation)(
    'Install extension through Extension page',
    async () => {
      const extensionsPage = await navBar.openExtensions();
      await extensionsPage.installExtensionFromOCIImage('ghcr.io/containers/podman-desktop-extension-bootc');

      await playExpect
        .poll(async () => await extensionsPage.extensionIsInstalled(extensionLabel), { timeout: 30000 })
        .toBeTruthy();
    },
    200000,
  );

  describe.each([ArchitectureType.ARM64, ArchitectureType.AMD64])(
    'Bootc images for architecture: %s',
    async architecture => {
      test('Build bootc image from containerfile', async () => {
        imageBuildFailed = true;
        let imagesPage = await navBar.openImages();
        await playExpect(imagesPage.heading).toBeVisible();

        let buildImagePage = await imagesPage.openBuildImage();
        await playExpect(buildImagePage.heading).toBeVisible();

        imagesPage = await buildImagePage.buildImage(
          `${imageName}:${imageTag}`,
          containerFilePath,
          contextDirectory,
          architecture,
          180000,
        );

        await playExpect.poll(async () => await imagesPage.waitForImageExists(imageName)).toBeTruthy();
        imageBuildFailed = false;
      }, 210000);

      describe.skipIf(isLinux).each(['QCOW2', 'AMI', 'RAW', 'VMDK', 'ISO'])('Building images ', async type => {
        test(`Building bootable image type: ${type}`, async context => {
          if (imageBuildFailed) {
            console.log('Image build failed, skipping test');
            context.skip();
          }

          if (type === 'ISO') {
            if (buildISOImage) {
              timeoutForBuild = 1200000;
              console.log(`Building ISO image requested, extending timeout to ${timeoutForBuild}`);
            } else {
              console.log(`Building ISO image not requested, skipping test`);
              context.skip();
            }
          }

          const imagesPage = await navBar.openImages();
          await playExpect(imagesPage.heading).toBeVisible();

          const imageDetailPage = await imagesPage.openImageDetails(imageName);
          await playExpect(imageDetailPage.heading).toBeVisible();

          const pathToStore = path.resolve(__dirname, '..', 'tests', 'output', 'images', `${type}-${architecture}`);
          [page, webview] = await handleWebview();
          const bootcPage = new BootcPage(page, webview);
          const result = await bootcPage.buildDiskImage(
            `${imageName}:${imageTag}`,
            pathToStore,
            type,
            architecture,
            timeoutForBuild,
          );
          console.log(
            `Building disk image for platform ${os.platform()} and architecture ${architecture} and type ${type} is ${result}`,
          );
          if (isWindows && architecture === ArchitectureType.ARM64) {
            console.log('Expected to fail on Windows for ARM64');
            playExpect(result).toBeFalsy();
          } else {
            console.log('Expected to pass on Linux, Windows and macOS');
            playExpect(result).toBeTruthy();
          }
        }, 1250000);
      });
    },
  );

  test('Remove bootc extension through Settings', async () => {
    await ensureBootcIsRemoved();
  });
});

async function ensureBootcIsRemoved(): Promise<void> {
  let extensionsPage = await navBar.openExtensions();
  if (!(await extensionsPage.extensionIsInstalled(extensionLabel))) return;

  const bootcExtensionPage = await extensionsPage.openExtensionDetails(extensionName, extensionLabel, extensionHeading);
  await bootcExtensionPage.removeExtension();
  extensionsPage = await navBar.openExtensions();

  await playExpect
    .poll(async () => await extensionsPage.extensionIsInstalled(extensionLabel), { timeout: 30000 })
    .toBeFalsy();
}

async function handleWebview(): Promise<[Page, Page]> {
  await page.getByLabel('Bootable Containers').click();
  await page.waitForTimeout(2000);

  const webView = page.getByRole('document', { name: 'Bootable Containers' });
  await playExpect(webView).toBeVisible();
  await new Promise(resolve => setTimeout(resolve, 1000));
  const [mainPage, webViewPage] = pdRunner.getElectronApp().windows();
  await mainPage.evaluate(() => {
    const element = document.querySelector('webview');
    if (element) {
      (element as HTMLElement).focus();
    } else {
      console.log(`element is null`);
    }
  });

  return [mainPage, webViewPage];
}
