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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { History } from './history';
import * as os from 'node:os';
import * as path from 'node:path';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('History class tests', () => {
  test('check simple add and get', async () => {
    vi.mock('node:fs', async () => {
      return {
        readFile: vi.fn().mockImplementation(() => '[]'),
        writeFile: vi.fn().mockImplementation(() => Promise.resolve()),
        existsSync: vi.fn().mockImplementation(() => true),
        mkdir: vi.fn().mockImplementation(() => Promise.resolve()),
      };
    });

    const tmpDir = os.tmpdir();
    const tmpFilePath = path.join(tmpDir, `tempfile-${Date.now()}`);
    const history = new History(tmpFilePath);

    await history.addOrUpdateBuildInfo({
      id: 'exampleName',
      image: 'exampleImageName',
      tag: 'exampleTag',
      engineId: 'exampleEngineId',
      type: 'exampleType',
      folder: 'exampleFolder',
      arch: 'exampleArch',
      status: 'success', // Use appropriate status from BootcBuildStatus
    });

    expect(history.getLastFolder()).toEqual('exampleFolder');
  });

  test('check get returns latest after multiple adds', async () => {
    vi.mock('node:fs', async () => {
      return {
        readFile: vi.fn().mockImplementation(() => '[]'),
        writeFile: vi.fn().mockImplementation(() => Promise.resolve()),
        existsSync: vi.fn().mockImplementation(() => true),
        mkdir: vi.fn().mockImplementation(() => Promise.resolve()),
      };
    });

    const tmpDir = os.tmpdir();
    const tmpFilePath = path.join(tmpDir, `tempfile-${Date.now()}`);
    const history = new History(tmpFilePath);

    await history.addOrUpdateBuildInfo({
      id: 'name1',
      image: 'exampleName0',
      tag: 'exampleTag0',
      engineId: 'exampleEngineId0',
      type: 'exampleType0',
      folder: 'exampleFolder0',
      arch: 'exampleArch0',
      status: 'success',
    });

    await history.addOrUpdateBuildInfo({
      id: 'name1',
      image: 'exampleName1',
      tag: 'exampleTag1',
      engineId: 'exampleEngineId1',
      type: 'exampleType1',
      folder: 'exampleFolder1',
      arch: 'exampleArch1',
      status: 'success',
    });

    await history.addOrUpdateBuildInfo({
      id: 'name1',
      image: 'exampleName2',
      tag: 'exampleTag2',
      engineId: 'exampleEngineId2',
      type: 'exampleType2',
      folder: 'exampleFolder2',
      arch: 'exampleArch2',
      status: 'success',
    });

    expect(history.getLastFolder()).toEqual('exampleFolder2');
  });
});
