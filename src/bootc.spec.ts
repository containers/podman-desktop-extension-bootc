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
import { BootC } from './bootc';
import type { ExtensionContext } from '@podman-desktop/api';

const mockedExtensionContext = {} as unknown as ExtensionContext;

const bootc = new BootC(mockedExtensionContext);

vi.mock('@podman-desktop/api', async () => {
  return {};
});

/// mock console.log
const originalConsoleLog = console.log;
const consoleLogMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  console.log = consoleLogMock;
});

afterEach(() => {
  console.log = originalConsoleLog;
});

test('check activate ', async () => {
  await bootc.activate();

  // expect the activate method to be called on the bootc class
  expect(consoleLogMock).toBeCalledWith('starting boot-c extension');
});

test('check deactivate ', async () => {
  await bootc.deactivate();

  // expect the deactivate method to be called on the bootc class
  expect(consoleLogMock).toBeCalledWith('stopping boot-c extension');
});
