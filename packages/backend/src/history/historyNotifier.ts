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

import { type Disposable, type Webview } from '@podman-desktop/api';
import * as podmanDesktopApi from '@podman-desktop/api';
import path from 'node:path';
import { Messages } from '/@shared/src/messages/Messages';
import { BOOTC_HISTORY_FILENAME } from '../history';

export class HistoryNotifier implements Disposable {
  #watcher: podmanDesktopApi.FileSystemWatcher;

  constructor(
    private webview: Webview,
    private readonly storagePath: string,
  ) {
    this.#watcher = podmanDesktopApi.fs.createFileSystemWatcher(path.join(this.storagePath, BOOTC_HISTORY_FILENAME));
    this.#watcher.onDidChange(this.notify.bind(this));
    this.#watcher.onDidCreate(this.notify.bind(this));
    this.#watcher.onDidDelete(this.notify.bind(this));
  }

  async notify(): Promise<void> {
    await this.webview.postMessage({
      id: Messages.MSG_HISTORY_UPDATE,
      // Must pass in an empty body to satisfy the type system, if it is undefined, this fails.
      body: {},
    });
  }

  public dispose(): void {
    this.#watcher.dispose();
  }
}
