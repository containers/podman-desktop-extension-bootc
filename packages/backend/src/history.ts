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

const filename = 'history.json';

interface ImageInfo {
  image: string;
  type: string;
  location: string;
}

export class History {
  infos: ImageInfo[] = [];

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

  public async addImageBuild(image: string, type: string, location: string) {
    // remove any previous entry
    this.infos = this.infos.filter(info => info.image !== image || info.type !== type);

    // add new item to the front
    this.infos = [{ image, type, location } as ImageInfo, ...this.infos];

    // cull the full list at the last 100
    if (this.infos.length > 100) {
      this.infos.slice(0, 100);
    }

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
}
