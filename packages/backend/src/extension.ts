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
import { buildDiskImage } from './build-disk-image';
import { History } from './history';
import fs from 'node:fs';
import { bootcBuildOptionSelection } from './quickpicks';
import { RpcExtension } from '/@shared/src/messages/MessageProxy';
import { BootcApiImpl } from './api-impl';
import { HistoryNotifier } from './history/historyNotifier';
import type { BuildType } from '/@shared/src/models/bootc';

export async function activate(extensionContext: ExtensionContext): Promise<void> {
  console.log('starting bootc extension');

  const history = new History(extensionContext.storagePath);
  await history.loadFile();

  extensionContext.subscriptions.push(
    extensionApi.commands.registerCommand('bootc.image.build', async image => {
      const selections = await bootcBuildOptionSelection(history);
      if (selections) {
        // Get a unique name for the build
        const name = await history.getUnusedHistoryName(image.name);

        await buildDiskImage(
          {
            id: name,
            image: image.name,
            tag: image.tag,
            engineId: image.engineId,
            type: [selections.type as BuildType],
            folder: selections.folder,
            arch: selections.arch,
          },
          history,
        );
      }
    }),
  );

  const panel = extensionApi.window.createWebviewPanel('bootc', 'Bootc', {
    localResourceRoots: [extensionApi.Uri.joinPath(extensionContext.extensionUri, 'media')],
  });
  extensionContext.subscriptions.push(panel);

  const indexHtmlUri = extensionApi.Uri.joinPath(extensionContext.extensionUri, 'media', 'index.html');
  const indexHtmlPath = indexHtmlUri.fsPath;
  let indexHtml = await fs.promises.readFile(indexHtmlPath, 'utf8');

  // replace links with webView Uri links
  // in the content <script type="module" crossorigin src="./index-RKnfBG18.js"></script> replace src with webview.asWebviewUri
  const scriptLink = indexHtml.match(/<script.*?src="(.*?)".*?>/g);
  if (scriptLink) {
    scriptLink.forEach(link => {
      const src = link.match(/src="(.*?)"/);
      if (src) {
        const webviewSrc = panel.webview.asWebviewUri(
          extensionApi.Uri.joinPath(extensionContext.extensionUri, 'media', src[1]),
        );
        indexHtml = indexHtml.replace(src[1], webviewSrc.toString());
      }
    });
  }

  // and now replace for css file as well
  const cssLink = indexHtml.match(/<link.*?href="(.*?)".*?>/g);
  if (cssLink) {
    cssLink.forEach(link => {
      const href = link.match(/href="(.*?)"/);
      if (href) {
        const webviewHref = panel.webview.asWebviewUri(
          extensionApi.Uri.joinPath(extensionContext.extensionUri, 'media', href[1]),
        );
        indexHtml = indexHtml.replace(href[1], webviewHref.toString());
      }
    });
  }

  // Update the html
  panel.webview.html = indexHtml;

  // Register the 'api' for the webview to communicate to the backend
  const rpcExtension = new RpcExtension(panel.webview);
  const bootcApi = new BootcApiImpl(extensionContext, panel.webview);
  rpcExtension.registerInstance<BootcApiImpl>(BootcApiImpl, bootcApi);

  // Create the historyNotifier and push to subscriptions
  // so the frontend can be notified when the history changes and so we can update the UI / call listHistoryInfo
  const historyNotifier = new HistoryNotifier(panel.webview, extensionContext.storagePath);
  extensionContext.subscriptions.push(historyNotifier);
}

export async function deactivate(): Promise<void> {
  console.log('stopping bootc extension');
}
