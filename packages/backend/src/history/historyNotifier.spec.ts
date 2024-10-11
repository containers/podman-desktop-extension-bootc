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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import os from 'os';
import type { Webview, FileSystemWatcher } from '@podman-desktop/api';
import { fs } from '@podman-desktop/api';
import { HistoryNotifier } from './historyNotifier';

vi.mock('@podman-desktop/api', () => {
  return {
    fs: {
      createFileSystemWatcher: () => ({
        onDidCreate: vi.fn(),
        onDidDelete: vi.fn(),
        onDidChange: vi.fn(),
      }),
    },
    window: {
      showErrorMessage: vi.fn(),
    },
  };
});

vi.mock('node:fs', () => {
  return {
    existsSync: vi.fn(),
    promises: {
      readFile: vi.fn(),
    },
  };
});

let historyMock: HistoryNotifier;

beforeEach(() => {
  vi.resetAllMocks();
});

test('Expect postMessage to be called when doing .notify', async () => {
  const tmpDir = os.tmpdir();
  console.log(tmpDir);
  const postMessageMock = vi.fn().mockResolvedValue(undefined);
  historyMock = new HistoryNotifier({ postMessage: postMessageMock } as unknown as Webview, '/foobar');
  await historyMock.notify();
  expect(postMessageMock).toHaveBeenCalledTimes(1);
});

describe('Tests involving a file system change', () => {
  let onDidCreateListener: () => void;
  let onDidDeleteListener: () => void;
  let onDidChangeListener: () => void;

  beforeEach(() => {
    vi.spyOn(fs, 'createFileSystemWatcher').mockReturnValue({
      onDidCreate: vi.fn().mockImplementation(listener => (onDidCreateListener = listener)),
      onDidDelete: vi.fn().mockImplementation(listener => (onDidDeleteListener = listener)),
      onDidChange: vi.fn().mockImplementation(listener => (onDidChangeListener = listener)),
    } as unknown as FileSystemWatcher);
  });

  test('Expect notify to be called when onDidChange is triggered', async () => {
    const postMessageMock = vi.fn().mockResolvedValue(undefined);
    historyMock = new HistoryNotifier({ postMessage: postMessageMock } as unknown as Webview, '/foobar');
    onDidChangeListener();
    expect(postMessageMock).toHaveBeenCalledTimes(1);
    expect(postMessageMock).toHaveBeenCalledWith({
      id: 'history-update',
      body: {},
    });
  });

  test('Expect notify to be called when onDidCreate is triggered', async () => {
    const postMessageMock = vi.fn().mockResolvedValue(undefined);
    historyMock = new HistoryNotifier({ postMessage: postMessageMock } as unknown as Webview, '/foobar');
    onDidCreateListener();
    expect(postMessageMock).toHaveBeenCalledTimes(1);
  });

  test('Expect notify to be called when onDidDelete is triggered', async () => {
    const postMessageMock = vi.fn().mockResolvedValue(undefined);
    historyMock = new HistoryNotifier({ postMessage: postMessageMock } as unknown as Webview, '/foobar');
    onDidDeleteListener();
    expect(postMessageMock).toHaveBeenCalledTimes(1);
  });

  test('Expect notify to be called 3 times if file system watcher events are triggered 3 times', async () => {
    const postMessageMock = vi.fn().mockResolvedValue(undefined);
    historyMock = new HistoryNotifier({ postMessage: postMessageMock } as unknown as Webview, '/foobar');
    onDidChangeListener();
    onDidCreateListener();
    onDidDeleteListener();
    expect(postMessageMock).toHaveBeenCalledTimes(3);
  });
});
