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
import {
  NavigationBar,
  Runner,
  deleteImage,
  removeFolderIfExists,
  waitForPodmanMachineStartup,
  test,
  expect as playExpect,
  RunnerOptions,
} from '@podman-desktop/tests-playwright';
import * as path from 'node:path';
import * as os from 'node:os';
import { BootcPage } from './model/bootc-page';
import { ArchitectureType } from '@podman-desktop/tests-playwright';
import { fileURLToPath } from 'node:url';

let page: Page;
let webview: Page;
let extensionInstalled = false;
const imageName = 'quay.io/centos-bootc/centos-bootc';
const imageTag = 'stream9';
const extensionName = 'bootc';
const extensionLabel = 'redhat.bootc';
const extensionHeading = 'Bootable Container';
const isLinux = os.platform() === 'linux';
const isWindows = os.platform() === 'win32';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const containerFilePath = path.resolve(__dirname, '..', 'resources', 'bootable-containerfile');
const contextDirectory = path.resolve(__dirname, '..', 'resources');
const skipInstallation = process.env.SKIP_INSTALLATION;
const buildISOImage = process.env.BUILD_ISO_IMAGE;
let timeoutForBuild = 900000;
let imageBuildFailed = true;

test.use({
  runnerOptions: new RunnerOptions({ customFolder: 'bootc-tests-pd', autoUpdate: false, autoCheckUpdates: false }),
});
test.beforeAll(async ({ runner, welcomePage, page }) => {
  await removeFolderIfExists('tests/output/images');
  runner.setVideoAndTraceName('bootc-e2e');
  await welcomePage.handleWelcomePage(true);
  await waitForPodmanMachineStartup(page);
});

test.afterAll(async ({ runner, page }) => {
  test.setTimeout(180000);
  try {
    await deleteImage(page, imageName);
  } catch (error) {
    console.log(`Error deleting image: ${error}`);
  } finally {
    await removeFolderIfExists('tests/output/images');
    await runner.close();
  }
});

test.describe('BootC Extension', () => {
  test('Go to settings and check if extension is already installed', async ({ navigationBar }) => {
    const extensionsPage = await navigationBar.openExtensions();
    if (await extensionsPage.extensionIsInstalled(extensionLabel)) extensionInstalled = true;
  });

  test('Uninstalled previous version of bootc extension', async ({ navigationBar }) => {
    test.skip(!extensionInstalled || !!skipInstallation);
    test.setTimeout(200000);
    console.log('Extension found already installed, trying to remove!');
    await ensureBootcIsRemoved(navigationBar);
  });

  test('Install extension through Extension page', async ({ navigationBar }) => {
    test.skip(!!skipInstallation);
    test.setTimeout(200000);

    const extensionsPage = await navigationBar.openExtensions();
    await extensionsPage.installExtensionFromOCIImage('ghcr.io/containers/podman-desktop-extension-bootc');

    await playExpect
      .poll(async () => await extensionsPage.extensionIsInstalled(extensionLabel), { timeout: 30000 })
      .toBeTruthy();
  });

  const architectures = [ArchitectureType.AMD64, ArchitectureType.ARM64];

  for (const architecture of architectures) {
    test.describe.serial(`Bootc images for architecture: ${architecture}`, () => {
      test(`Build bootc image from containerfile for architecture: ${architecture}`, async ({ navigationBar }) => {
        test.setTimeout(210000);

        imageBuildFailed = true;
        let imagesPage = await navigationBar.openImages();
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
      });

      const types = ['QCOW2', 'AMI', 'RAW', 'VMDK', 'ISO', 'VHD'];

      for (const type of types) {
        test.describe.serial('Building images ', () => {
          test(`Building bootable image type: ${type}`, async ({ runner, navigationBar }) => {
            test.skip(isLinux);
            test.setTimeout(1250000);

            if (imageBuildFailed) {
              console.log('Image build failed, skipping test');
              test.skip();
            }

            if (type === 'ISO') {
              if (buildISOImage) {
                timeoutForBuild = 1200000;
                console.log(`Building ISO image requested, extending timeout to ${timeoutForBuild}`);
              } else {
                console.log(`Building ISO image not requested, skipping test`);
                test.skip();
              }
            }

            const imagesPage = await navigationBar.openImages();
            await playExpect(imagesPage.heading).toBeVisible();

            const imageDetailPage = await imagesPage.openImageDetails(imageName);
            await playExpect(imageDetailPage.heading).toBeVisible();

            const pathToStore = path.resolve(
              __dirname,
              '..',
              'tests',
              'playwright',
              'output',
              'images',
              `${type}-${architecture}`,
            );
            [page, webview] = await handleWebview(runner);
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
          });
        });
      }
    });
  }

  test('Remove bootc extension through Settings', async ({ navigationBar }) => {
    await ensureBootcIsRemoved(navigationBar);
  });
});

async function ensureBootcIsRemoved(navigationBar: NavigationBar): Promise<void> {
  let extensionsPage = await navigationBar.openExtensions();
  if (!(await extensionsPage.extensionIsInstalled(extensionLabel))) return;

  const bootcExtensionPage = await extensionsPage.openExtensionDetails(extensionName, extensionLabel, extensionHeading);
  await bootcExtensionPage.removeExtension();
  extensionsPage = await navigationBar.openExtensions();

  await playExpect
    .poll(async () => await extensionsPage.extensionIsInstalled(extensionLabel), { timeout: 30000 })
    .toBeFalsy();
}

async function handleWebview(runner: Runner): Promise<[Page, Page]> {
  const page = runner.getPage();
  await page.getByLabel('Bootable Containers').click();
  await page.waitForTimeout(2000);

  const webView = page.getByRole('document', { name: 'Bootable Containers' });
  await playExpect(webView).toBeVisible();
  await new Promise(resolve => setTimeout(resolve, 1000));
  const [mainPage, webViewPage] = runner.getElectronApp().windows();
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
