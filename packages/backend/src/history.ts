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
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import * as extensionApi from '@podman-desktop/api';
import type { BootcBuildStatus, BootcHistoryInfo } from '@shared/src/models/bootc';

const filename = 'history.json';

export class History {
  infos: BootcHistoryInfo[] = [];

  constructor(private readonly storagePath: string) {}

  async loadFile() {
    // check if history file exists, and load history from previous run
    try {
      if (!existsSync(this.storagePath)) {
        return;
      }

      const filePath = path.resolve(this.storagePath, filename);
      if (!existsSync(filePath)) {
        return;
      }

      const infoBuffer = await readFile(filePath, 'utf8');
      this.infos = JSON.parse(infoBuffer);
    } catch (err) {
      console.error(err);
    }
  }

  public getLastLocation(): string | undefined {
    if (this.infos.length === 0) {
      return undefined;
    } else {
      return this.infos[0].location;
    }
  }

  // Sometimes Podman Desktop gets reloaded while the build is still running.
  // if you re-open PD and the build is still "running" but there is no container running,
  // we need to mark it as lost.
  public async recoverLostBuilds(): Promise<void> {
    // Get the list of containers
    const containers = await extensionApi.containerEngine.listContainers();

    // For each build that is marked as "running" but has *zero* containers running, mark it as lost.
    for (const info of this.infos) {
      if (info.status === 'running') {
        console.log('Containers: ', containers);

        // Find container that matches the buildContainerId
        // if that container does not exist, mark the build as lost
        const container = containers.find(container => container.Id === info.buildContainerId);
        if (!container) {
          info.status = 'lost';

          // Save the file after we mark the build as lost
          this.saveFile().catch((err: unknown) => console.error('Unable to save history', err));
        }
      }
    }
  }

  public async addImageBuild(
    image: string,
    tag: string,
    type: string,
    location: string,
    arch: string,
    status: BootcBuildStatus,
  ) {
    // remove any previous entry that matches the exact image name, type AND arch that was built.
    this.infos = this.infos.filter(
      info => info.image !== image || info.type !== type || info.arch !== arch || tag !== tag,
    );

    // Timestamp / unix time
    const timestamp = new Date().toISOString();

    // add new item to the front
    this.infos = [{ image, tag, type, location, arch, status, timestamp } as BootcHistoryInfo, ...this.infos];

    // cull the full list at the last 100
    if (this.infos.length > 100) {
      this.infos.slice(0, 100);
    }

    this.saveFile().catch((err: unknown) => console.error('Unable to save history', err));
  }

  public async updateImageBuildStatus(
    image: string,
    tag: string,
    type: string,
    arch: string,
    status: BootcBuildStatus,
  ) {
    // Find the first entry that matches the exact image name, type and arch.
    const index = this.infos.findIndex(
      info => info.image === image && info.type === type && info.arch === arch && tag === tag,
    );

    // Update the entries status if found
    if (index !== -1) {
      this.infos[index].status = status;
      this.saveFile().catch((err: unknown) => console.error('Unable to save history', err));
    }
  }

  public async updateImageBuildContainerId(
    image: string,
    tag: string,
    type: string,
    arch: string,
    buildContainerId: string,
  ) {
    const index = this.infos.findIndex(
      info => info.image === image && info.type === type && info.arch === arch && tag === tag,
    );

    // Update the entries status if found
    if (index !== -1) {
      this.infos[index].buildContainerId = buildContainerId;
      this.saveFile().catch((err: unknown) => console.error('Unable to save history', err));
    }
  }

  public async removeImageBuild(image: string, tag: string, type: string, arch: string) {
    // remove any previous entry that matches the exact image name, tag, type and arch
    this.infos = this.infos.filter(
      info => info.image !== image || info.type !== type || info.arch !== arch || tag !== tag,
    );
    this.saveFile().catch((err: unknown) => console.error('Unable to save history', err));
  }

  public async saveFile() {
    try {
      if (!existsSync(this.storagePath)) {
        await mkdir(this.storagePath);
      }

      const filePath = path.resolve(this.storagePath, filename);
      await writeFile(filePath, JSON.stringify(this.infos, undefined, 2));
    } catch (err: unknown) {
      console.error(err);
    }
  }

  // Prune the ENTIRE history / delete every entry
  public async pruneHistory() {
    this.infos = [];
    this.saveFile().catch((err: unknown) => console.error('Unable to save history', err));
  }
}
