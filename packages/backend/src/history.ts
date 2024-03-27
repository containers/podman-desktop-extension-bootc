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
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

export const BOOTC_HISTORY_FILENAME = 'history.json';

export class History {
  private infos: BootcBuildInfo[] = [];

  constructor(private readonly storagePath: string) {}

  getHistory(): BootcBuildInfo[] {
    return this.infos;
  }

  async loadFile(): Promise<void> {
    // check if history file exists, and load history from previous run
    try {
      if (!existsSync(this.storagePath)) {
        return;
      }

      const filePath = path.resolve(this.storagePath, BOOTC_HISTORY_FILENAME);
      if (!existsSync(filePath)) {
        return;
      }

      const infoBuffer = await readFile(filePath, 'utf8');
      this.infos = JSON.parse(infoBuffer);

      // Sometimes the history file may have undefined names due to an older version, ensure all names are set
      await this.ensureNoUndefinedNames();
    } catch (err) {
      console.error(err);
    }
  }

  public async addOrUpdateBuildInfo(buildInfo: BootcBuildInfo): Promise<void> {
    const index = this.infos.findIndex(info => info.id === buildInfo.id);
    if (index !== -1) {
      this.infos[index] = { ...this.infos[index], ...buildInfo };
    } else {
      buildInfo.timestamp = new Date().toISOString(); // Ensure timestamp is set for new entries
      this.infos.unshift(buildInfo);
    }
    if (this.infos.length > 100) {
      this.infos.length = 100; // Keep the history size manageable
    }
    await this.saveFile();
  }

  public async removeBuildInfo(buildInfo: BootcBuildInfo): Promise<void> {
    this.infos = this.infos.filter(info => !(info.id === buildInfo.id));
    await this.saveFile();
  }

  protected async saveFile(): Promise<void> {
    try {
      await mkdir(this.storagePath, { recursive: true });
      const filePath = path.resolve(this.storagePath, BOOTC_HISTORY_FILENAME);
      await writeFile(filePath, JSON.stringify(this.infos, undefined, 2));
    } catch (err) {
      console.error('Error saving file:', err);
    }
  }

  public getLastFolder(): string | undefined {
    return this.infos?.[0]?.folder;
  }

  // Check the history file for any undefined "name" fields, if they are undefined, set them to a unique name
  // and save the history file. This is because this is from an older version of the extension where the name
  // field was not required. Rather than deleting the file, we'll just update it with the new field.
  public async ensureNoUndefinedNames(): Promise<void> {
    let changed = false;
    for (let i = 0; i < this.infos.length; i++) {
      if (!this.infos[i].id && this.infos[i].image) {
        // Update the 'name' field with the name of the image
        const segments = this.infos[i].image.split('/');
        const imageName = segments?.pop() ?? this.infos[i].image; // Fallback to name if split is an empty last segment
        this.infos[i].id = await this.getUnusedHistoryName(imageName);
        console.log(`Updated history entry ${this.infos[i].image} with name: ${this.infos[i].id}`);
        changed = true;
      }
    }
    if (changed) {
      await this.saveFile();
    }
  }

  // same as getUnusedName from build-disk-image.ts but instead checks from the history information.
  public async getUnusedHistoryName(name: string): Promise<string> {
    // Extract the last segment after the last '/' as the imageName.
    const segments = name.split('/');
    const imageName = segments.pop() ?? name; // Fallback to name if split is an empty last segment

    let builds: string[] = [];
    try {
      // Get a list of all existing container names.
      builds = this.infos.map(c => c.id);
    } catch (e) {
      console.warn('Could not get existing container names');
      console.warn(e);
    }

    // Check if the imageName is unique, and find a unique name by appending a count if necessary.
    if (builds.includes(imageName)) {
      let count = 2; // Start with 2 since imageName without a suffix is considered the first
      let newName: string;
      do {
        newName = `${imageName}-${count}`;
        count++;
      } while (builds.includes(newName));
      return newName;
    }

    // If imageName is already unique, return it as is.
    return imageName;
  }
}
