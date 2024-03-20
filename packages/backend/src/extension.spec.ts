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
import type * as podmanDesktopApi from '@podman-desktop/api';
import { activate, deactivate } from './extension';
import * as fs from 'node:fs';
import os from 'node:os';

/// mock console.log
const originalConsoleLog = console.log;
const consoleLogMock = vi.fn();

vi.mock('@podman-desktop/api', async () => {
  return {
    env: {
      createTelemetryLogger: vi.fn(),
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

test('check deactivate', async () => {
  await deactivate();

  expect(consoleLogMock).toBeCalledWith('stopping bootc extension');
});
