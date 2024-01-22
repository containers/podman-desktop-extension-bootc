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

import type { ExtensionContext } from '@podman-desktop/api';
import * as extensionApi from '@podman-desktop/api';
import { launchVFKit } from './launch-vfkit';
import { buildDiskImage } from './build-disk-image';
import { History } from './history';

export async function activate(extensionContext: ExtensionContext): Promise<void> {
  console.log('starting bootc extension');

  const history = new History(extensionContext.storagePath);
  await history.loadFile();

  extensionContext.subscriptions.push(
    extensionApi.commands.registerCommand('bootc.vfkit', async container => {
      await launchVFKit(container);
    }),

    extensionApi.commands.registerCommand('bootc.image.build', async image => {
      await buildDiskImage(image, history);
    }),
  );
}

export async function deactivate(): Promise<void> {
  console.log('stopping bootc extension');
}
