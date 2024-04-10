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

import { beforeEach, expect, test, vi } from 'vitest';
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

beforeEach(() => {
  vi.clearAllMocks();
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

  vi.spyOn(extensionApi.process, 'exec').mockReturnValueOnce(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  // Mock existsSync to return true (the "fake" file is there)
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);

  // Mock the readFile function to return the "fake" file with rootful being true
  vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify({ Rootful: true }));
  await expect(machineUtils.isPodmanMachineRootful()).resolves.toBe(true);
});

test('Fail isPodmanMachineRootful functionality be false if Rootful does not exist in the root of the object, or in HostUser', async () => {
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

  vi.spyOn(extensionApi.process, 'exec').mockReturnValueOnce(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  // Mock existsSync to return true (the "fake" file is there)
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);

  // Mock the readFile function to return the "fake" file with Rootful not existing
  vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify({}));
  await expect(machineUtils.isPodmanMachineRootful()).resolves.toBe(false);
});

test('Pass true if Rootful is in HostUser', async () => {
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

  vi.spyOn(extensionApi.process, 'exec').mockReturnValueOnce(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  // Mock existsSync to return true (the "fake" file is there)
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);

  // Mock the readFile function to return the "fake" file with Rootful not existing
  vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify({ HostUser: { Rootful: true } }));
  await expect(machineUtils.isPodmanMachineRootful()).resolves.toBe(true);
});

test('Check isPodmanV5Machine on 4.9', async () => {
  const fakeMachineInfoJSON = {
    Version: {
      Version: '4.9.4',
    },
  };

  vi.spyOn(extensionApi.process, 'exec').mockReturnValueOnce(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  // Mock existsSync to return true (the "fake" file is there)
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);

  // Mock the readFile function to return the "fake" file with rootful being true
  vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify({ Rootful: true }));
  await expect(machineUtils.isPodmanV5Machine()).resolves.toBe(false);
});

test('Check isPodmanV5Machine on 5.0', async () => {
  const fakeMachineInfoJSON = {
    Version: {
      Version: '5.0.0',
    },
  };

  vi.spyOn(extensionApi.process, 'exec').mockReturnValueOnce(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  // Mock existsSync to return true (the "fake" file is there)
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);

  // Mock the readFile function to return the "fake" file with rootful being true
  vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify({ Rootful: true }));
  await expect(machineUtils.isPodmanV5Machine()).resolves.toBe(true);
});

test('Check isPodmanV5Machine on 5.0.0-dev resolves to be true', async () => {
  const fakeMachineInfoJSON = {
    Version: {
      Version: '5.0.0-dev',
    },
  };

  vi.spyOn(extensionApi.process, 'exec').mockReturnValueOnce(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  // Mock existsSync to return true (the "fake" file is there)
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);

  // Mock the readFile function to return the "fake" file with rootful being true
  vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify({ Rootful: true }));
  await expect(machineUtils.isPodmanV5Machine()).resolves.toBe(true);
});

test('Fail if machine version is 4.0.0 for isPodmanV5Machine', async () => {
  const fakeMachineInfoJSON = {
    Version: {
      Version: '4.0.0',
    },
  };

  vi.spyOn(extensionApi.process, 'exec').mockReturnValueOnce(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  // Mock existsSync to return true (the "fake" file is there)
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);

  // Mock the readFile function to return the "fake" file with rootful being true
  vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify({ Rootful: true }));
  await expect(machineUtils.isPodmanV5Machine()).resolves.toBe(false);
});

test('Fail if machine version is 4.0.0-dev for isPodmanV5Machine', async () => {
  const fakeMachineInfoJSON = {
    Version: {
      Version: '4.0.0-dev',
    },
  };

  vi.spyOn(extensionApi.process, 'exec').mockReturnValueOnce(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  // Mock existsSync to return true (the "fake" file is there)
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);

  // Mock the readFile function to return the "fake" file with rootful being true
  vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify({ Rootful: true }));
  await expect(machineUtils.isPodmanV5Machine()).resolves.toBe(false);
});

test('Fail prereq if not Podman v5', async () => {
  const fakeMachineInfoJSON = {
    Version: {
      Version: '4.9.0',
    },
  };
  vi.spyOn(extensionApi.process, 'exec').mockReturnValueOnce(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  expect(await machineUtils.checkPrereqs()).toEqual('Podman v5.0 or higher is required to build disk images.');
});

test('Fail prereq if not rootful', async () => {
  const fakeMachineInfoJSON = {
    Host: {
      CurrentMachine: '',
      MachineConfigDir: '',
    },
    Version: {
      Version: '5.0.0',
    },
  };
  vi.spyOn(extensionApi.process, 'exec').mockReturnValue(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  vi.spyOn(fs.promises, 'readFile').mockReturnValueOnce(
    Promise.resolve(JSON.stringify({ HostUser: { Rootful: false } })),
  );

  expect(await machineUtils.checkPrereqs()).toEqual(
    'The podman machine is not set as rootful. Please recreate the podman machine with rootful privileges set and try again.',
  );
});

test('Pass prereq if rootful v5 machine', async () => {
  const fakeMachineInfoJSON = {
    Host: {
      CurrentMachine: '',
      MachineConfigDir: '',
    },
    Version: {
      Version: '5.0.0',
    },
  };

  vi.spyOn(extensionApi.process, 'exec').mockReturnValue(
    Promise.resolve({ stdout: JSON.stringify(fakeMachineInfoJSON) } as extensionApi.RunResult),
  );

  // Mock existsSync to return true (the "fake" file is there)
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);

  // Mock the readFile function to return the "fake" file with rootful being true
  vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify({ HostUser: { Rootful: true } }));
  await expect(machineUtils.isPodmanMachineRootful()).resolves.toBe(true);

  expect(await machineUtils.checkPrereqs()).toEqual(undefined);
});
