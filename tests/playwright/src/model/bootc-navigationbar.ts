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

import type { Locator, Page } from '@playwright/test';
import { expect as playExpect } from '@playwright/test';
import { BootcDashboardPage } from './bootc-dashboard-page';
import { BootcPage } from './bootc-page';
import { BootcExamples } from './bootc-examples-page';

export class BootcNavigationBar {
  readonly page: Page;
  readonly webview: Page;
  readonly navigationBar: Locator;
  readonly dashboardButtonLocator: Locator;
  readonly diskImagesButtonLocator: Locator;
  readonly examplesButtonLocator: Locator;

  constructor(page: Page, webview: Page) {
    this.page = page;
    this.webview = webview;
    this.navigationBar = webview.getByLabel('Navigation', { exact: true });
    this.dashboardButtonLocator = this.navigationBar.getByLabel('Dashboard', { exact: true });
    this.diskImagesButtonLocator = this.navigationBar.getByLabel('Disk Images', { exact: true });
    this.examplesButtonLocator = this.navigationBar.getByLabel('Examples', { exact: true });
  }

  async openBootcDashboard(): Promise<BootcDashboardPage> {
    await playExpect(this.dashboardButtonLocator).toBeVisible();
    await this.dashboardButtonLocator.click();
    return new BootcDashboardPage(this.page, this.webview);
  }

  async openBootcDiskImages(): Promise<BootcPage> {
    await playExpect(this.diskImagesButtonLocator).toBeVisible();
    await this.diskImagesButtonLocator.click();
    return new BootcPage(this.page, this.webview);
  }

  async openBootcExamples(): Promise<BootcExamples> {
    await playExpect(this.examplesButtonLocator).toBeVisible();
    await this.examplesButtonLocator.click();
    return new BootcExamples(this.page, this.webview);
  }
}
