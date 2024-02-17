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

import { beforeEach, expect, test, vi } from 'vitest';
import { History } from './history';

beforeEach(() => {
  vi.clearAllMocks();
});

test('check simple add and get', async () => {
  vi.mock('node:fs', async () => {
    return {
      readFile: vi.fn().mockImplementation(() => '[]'),
      writeFile: vi.fn().mockImplementation(() => Promise.resolve()),
      existsSync: vi.fn().mockImplementation(() => true),
    };
  });

  const history: History = new History('test');

  await history.addImageBuild('a', 'b', 'c');

  expect(history.getLastLocation()).toEqual('c');
});

test('check get returns latest after multiple adds', async () => {
  vi.mock('node:fs', async () => {
    return {
      readFile: vi.fn().mockImplementation(() => '[]'),
      writeFile: vi.fn().mockImplementation(() => Promise.resolve()),
      existsSync: vi.fn().mockImplementation(() => true),
    };
  });

  const history: History = new History('test');

  await history.addImageBuild('a0', 'b0', 'c0');
  await history.addImageBuild('a1', 'b1', 'c1');
  await history.addImageBuild('a2', 'b2', 'c2');

  expect(history.getLastLocation()).toEqual('c2');
});
