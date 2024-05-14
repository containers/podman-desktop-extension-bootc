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
import { NavigationBar, PodmanDesktopRunner, WelcomePage, deleteImage } from '@podman-desktop/tests-playwright';
import { expect as playExpect } from '@playwright/test';
import { RunnerTestContext } from '@podman-desktop/tests-playwright';
import * as path from 'node:path';
import * as os from 'node:os';
import { BootcPage } from './model/bootc-page';

let pdRunner: PodmanDesktopRunner;
let page: Page;
let webview: Page;
let navBar: NavigationBar;
let extensionInstalled = false;
const imageName = 'quay.io/centos-bootc/fedora-bootc';
const extensionName = 'bootc';
const extensionLabel = 'redhat.bootc';
const containerFilePath = path.resolve(__dirname, '..', 'resources', 'bootable-containerfile');
const contextDirectory = path.resolve(__dirname, '..', 'resources');
const isLinux = os.platform() === 'linux';
const skipInstallation = process.env.SKIP_INSTALLATION;

beforeEach<RunnerTestContext>(async ctx => {
  ctx.pdRunner = pdRunner;
});

beforeAll(async () => {
  pdRunner = new PodmanDesktopRunner({ customFolder: 'bootc-tests-pd', autoUpdate: false, autoCheckUpdate: false });
  page = await pdRunner.start();
  pdRunner.setVideoAndTraceName('bootc-e2e');

  const welcomePage = new WelcomePage(page);
  await welcomePage.handleWelcomePage(true);
  navBar = new NavigationBar(page);
});

afterAll(async () => {
  try {
    await deleteImage(page, imageName);
  } finally {
    await pdRunner.close();
  }
});

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

  test('Build bootc image from containerfile', async () => {
    let imagesPage = await navBar.openImages();
    await playExpect(imagesPage.heading).toBeVisible();

    const buildImagePage = await imagesPage.openBuildImage();
    await playExpect(buildImagePage.heading).toBeVisible();

    imagesPage = await buildImagePage.buildImage(`${imageName}:eln`, containerFilePath, contextDirectory);
    await playExpect.poll(async () => await imagesPage.waitForImageExists(imageName)).toBeTruthy();
  }, 150000);

  test.each([
    ['QCOW2', 'ARM64'],
    //['QCOW2', 'AMD64'],
    ['AMI', 'ARM64'],
    //['AMI', 'AMD64'],
    ['RAW', 'ARM64'],
    //['RAW', 'AMD64'],
    ['ISO', 'ARM64'],
    //['ISO', 'AMD64'],
  ])(
    'Building bootable image type: %s for architecture: %s',
    async (type, architecture) => {
      const imagesPage = await navBar.openImages();
      await playExpect(imagesPage.heading).toBeVisible();

      const imageDetailPage = await imagesPage.openImageDetails(imageName);
      await playExpect(imageDetailPage.heading).toBeVisible();

      const pathToStore = path.resolve(__dirname, '..', 'output', 'images', `${type}-${architecture}`);
      [page, webview] = await imageDetailPage.buildDiskImage(pdRunner);
      const bootcPAge = new BootcPage(page, webview);
      const result = await bootcPAge.buildDiskImage(pathToStore, type, architecture);
      playExpect(result).toBeTruthy();
    },
    350000,
  );

  test('Remove bootc extension through Settings', async () => {
    await ensureBootcIsRemoved();
  });
});

async function ensureBootcIsRemoved(): Promise<void> {
  let extensionsPage = await navBar.openExtensions();
  if (!(await extensionsPage.extensionIsInstalled(extensionLabel))) return;

  const bootcExtensionPage = await extensionsPage.openExtensionDetails(extensionName, extensionLabel);
  await bootcExtensionPage.removeExtension();
  extensionsPage = await navBar.openExtensions();

  await playExpect
    .poll(async () => await extensionsPage.extensionIsInstalled(extensionLabel), { timeout: 30000 })
    .toBeFalsy();
}
