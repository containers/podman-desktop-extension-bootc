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

import { expect, test, vi } from 'vitest';
import * as extensionApi from '@podman-desktop/api';
import type { Configuration } from '@podman-desktop/api';
import * as machineUtils from './machine-utils';
import * as fs from 'node:fs';

const config: Configuration = {
  get: () => {
    // not implemented
  },
  has: () => true,
  update: vi.fn(),
};

vi.mock('@podman-desktop/api', async () => {
  return {
    configuration: {
      getConfiguration: () => config,
      onDidChangeConfiguration: () => {
        return {
          dispose: vi.fn(),
        };
      },
    },
    process: {
      exec: vi.fn(),
    },
  };
});

test('Check isPodmanMachineRootful functionality', async () => {
  const fakeMachineInfoJSON = {
    Host: {
      Arch: 'amd64',
      CurrentMachine: '',
      DefaultMachine: '',
      EventsDir: 'dir1',
      MachineConfigDir: 'dir2',
      MachineImageDir: 'dir3',
      MachineState: '',
      NumberOfMachines: 5,
      OS: 'windows',
      VMType: 'wsl',
    },
  };

  vi.spyOn(extensionApi.process, 'exec').mockImplementation(
    () =>
      new Promise<extensionApi.RunResult>(resolve => {
        resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult);
      }),
  );

  // Mock existsSync to return true (the "fake" file is there)
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockImplementation(() => {
    return true;
  });

  // Mock the readFile function to return the "fake" file with rootful being true
  const spyReadFile = vi.spyOn(fs.promises, 'readFile');

  // Mock reading the file to have Rootful as true
  spyReadFile.mockResolvedValue(JSON.stringify({ Rootful: true }));
  await expect(machineUtils.isPodmanMachineRootful()).resolves.toBe(true);
});
