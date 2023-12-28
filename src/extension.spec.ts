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
import type * as podmanDesktopApi from '@podman-desktop/api';
import { activate, deactivate } from './extension';

const bootcActivateMock = vi.fn();
const bootcDeactivateMock = vi.fn();

vi.mock('@podman-desktop/api', async () => {
  return {};
});

vi.mock('./bootc', async () => {
  return {
    BootC: class {
      public activate = bootcActivateMock;
      public deactivate = bootcDeactivateMock;
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('check we call activate method on bootc ', async () => {
  const fakeContext = {} as unknown as podmanDesktopApi.ExtensionContext;

  await activate(fakeContext);

  // expect the activate method to be called on the bootc class
  expect(bootcActivateMock).toBeCalledTimes(1);

  // no call on deactivate
  expect(bootcDeactivateMock).not.toBeCalled();
});

test('check we call deactivate method on bootc ', async () => {
  await deactivate();

  // expect the activate method to be called on the bootc class
  expect(bootcDeactivateMock).toBeCalledTimes(1);

  // no call on activate
  expect(bootcActivateMock).not.toBeCalled();
});
