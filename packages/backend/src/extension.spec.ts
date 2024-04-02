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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as podmanDesktopApi from '@podman-desktop/api';
import { activate, deactivate, openBuildPage } from './extension';
import * as fs from 'node:fs';
import os from 'node:os';

/// mock console.log
const originalConsoleLog = console.log;
const consoleLogMock = vi.fn();

const mocks = vi.hoisted(() => ({
  logErrorMock: vi.fn(),
}));

vi.mock('../package.json', () => ({
  engines: {
    'podman-desktop': '>=1.0.0',
  },
}));

vi.mock('@podman-desktop/api', async () => {
  return {
    version: '1.8.0',
    env: {
      createTelemetryLogger: () => ({
        logUsage: vi.fn(),
        logError: mocks.logErrorMock,
      }),
    },
    commands: {
      registerCommand: vi.fn(),
    },
    Uri: class {
      static joinPath = () => ({ fsPath: '.' });
    },
    window: {
      createWebviewPanel: () => ({
        webview: {
          html: '',
          onDidReceiveMessage: vi.fn(),
          postMessage: vi.fn(),
        },
        onDidChangeViewState: vi.fn(),
      }),
      listWebviews: vi.fn().mockReturnValue([{ viewType: 'a' }, { id: 'test', viewType: 'bootc' }, { viewType: 'b' }]),
    },
    navigation: {
      navigateToWebview: vi.fn(),
    },
    fs: {
      createFileSystemWatcher: () => ({
        onDidCreate: vi.fn(),
        onDidDelete: vi.fn(),
        onDidChange: vi.fn(),
      }),
    },
  };
});

vi.mock('../package.json', () => ({
  engines: {
    'podman-desktop': '>=1.0.0',
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  console.log = consoleLogMock;
});

afterEach(() => {
  console.log = originalConsoleLog;
});

test('check activate', async () => {
  const tmpDir = os.tmpdir();
  const fakeContext = {
    subscriptions: {
      push: vi.fn(),
    },
    storagePath: tmpDir,
  } as unknown as podmanDesktopApi.ExtensionContext;
  vi.spyOn(fs.promises, 'readFile').mockImplementation(() => {
    return Promise.resolve('<html></html>');
  });
  await activate(fakeContext);

  expect(consoleLogMock).toBeCalledWith('starting bootc extension');
});

test('check activate incompatible', async () => {
  const tmpDir = os.tmpdir();
  const fakeContext = {
    subscriptions: {
      push: vi.fn(),
    },
    storagePath: tmpDir,
  } as unknown as podmanDesktopApi.ExtensionContext;

  (podmanDesktopApi.version as string) = '0.7.0';
  await expect(async () => {
    await activate(fakeContext);
  }).rejects.toThrowError('Extension is not compatible with Podman Desktop version below 1.0.0.');

  // expect the error to be logged
  expect(mocks.logErrorMock).toBeCalledWith('start.incompatible', {
    version: '0.7.0',
    message: 'error activating extension on version below 1.0.0',
  });
});

test('check activate with next version', async () => {
  const tmpDir = os.tmpdir();
  const fakeContext = {
    subscriptions: {
      push: vi.fn(),
    },
    storagePath: tmpDir,
  } as unknown as podmanDesktopApi.ExtensionContext;

  (podmanDesktopApi.version as string) = '1.0.1-next';
  await activate(fakeContext);

  expect(mocks.logErrorMock).not.toHaveBeenCalled();
});

test('check deactivate', async () => {
  await deactivate();

  expect(consoleLogMock).toBeCalledWith('stopping bootc extension');
});

test('check command triggers webview and redirects', async () => {
  const postMessageMock = vi.fn();
  const panel = {
    webview: {
      postMessage: postMessageMock,
    },
  } as unknown as podmanDesktopApi.WebviewPanel;

  const image = { name: 'build', tag: 'latest' };

  await openBuildPage(panel, image);

  expect(podmanDesktopApi.navigation.navigateToWebview).toHaveBeenCalled();
  expect(postMessageMock).toHaveBeenCalledWith({ body: 'build/latest', id: 'navigate-build' });
});
