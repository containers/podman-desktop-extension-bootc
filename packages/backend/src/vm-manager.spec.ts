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
import { createVMManager, stopCurrentVM } from './vm-manager';
import { isLinux, isMac, isArm } from './machine-utils';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import * as extensionApi from '@podman-desktop/api';
import fs from 'node:fs';

// Mock the functions from machine-utils
vi.mock('./machine-utils', () => ({
  isWindows: vi.fn(),
  isLinux: vi.fn(),
  isMac: vi.fn(),
  isArm: vi.fn(),
  isX86: vi.fn(),
}));
vi.mock('node:fs');
vi.mock('@podman-desktop/api', async () => ({
  process: {
    exec: vi.fn(),
  },
  env: {
    isLinux: vi.fn(),
    isMac: vi.fn(),
    isArm: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('createVMManager: should create a MacArmNativeVMManager for macOS ARM build', () => {
  const build = {
    id: '1',
    image: 'test-image',
    imageId: '1',
    tag: 'latest',
    type: ['raw'],
    folder: '/path/to/folder',
    arch: 'arm64',
  } as BootcBuildInfo;

  // Mock isMac and isArm to return true
  vi.mocked(isMac).mockReturnValue(true);
  vi.mocked(isArm).mockReturnValue(true);

  const vmManager = createVMManager(build);
  expect(vmManager.constructor.name).toBe('MacArmNativeVMManager');
});

test('createVMManager: should create a MacArmX86VMManager for macOS x86 build', () => {
  const build = {
    id: '2',
    image: 'test-image',
    imageId: '2',
    tag: 'latest',
    type: ['raw'],
    folder: '/path/to/folder',
    arch: 'amd64',
  } as BootcBuildInfo;

  // Mock isMac to return true
  vi.mocked(isMac).mockReturnValue(true);
  vi.mocked(isArm).mockReturnValue(true);

  const vmManager = createVMManager(build);
  expect(vmManager.constructor.name).toBe('MacArmX86VMManager');
});

test('createVMManager: should create a LinuxX86VMManager for Linux x86 build', () => {
  const build = {
    id: '2',
    image: 'test-image',
    imageId: '2',
    tag: 'latest',
    type: ['raw'],
    folder: '/path/to/folder',
    arch: 'amd64',
  } as BootcBuildInfo;

  // Mock isLinux to return true
  vi.mocked(isMac).mockReturnValue(false);
  vi.mocked(isArm).mockReturnValue(false);
  vi.mocked(isLinux).mockReturnValue(true);

  const vmManager = createVMManager(build);
  expect(vmManager.constructor.name).toBe('LinuxX86VMManager');
});

test('createVMManager: should create a LinuxArmVMManager for Linux ARM build', () => {
  const build = {
    id: '2',
    image: 'test-image',
    imageId: '2',
    tag: 'latest',
    type: ['raw'],
    folder: '/path/to/folder',
    arch: 'arm64',
  } as BootcBuildInfo;

  // Mock isLinux to return true
  vi.mocked(isMac).mockReturnValue(false);
  vi.mocked(isArm).mockReturnValue(false);
  vi.mocked(isLinux).mockReturnValue(true);

  const vmManager = createVMManager(build);
  expect(vmManager.constructor.name).toBe('LinuxArmVMManager');
});

test('createVMManager: should throw an error for unsupported OS/architecture', () => {
  const build = {
    id: '3',
    image: 'test-image',
    imageId: '3',
    tag: 'latest',
    type: ['raw'],
    folder: '/path/to/folder',
    arch: 'asdf',
  } as BootcBuildInfo;

  // Arch is explicitly set to an unsupported value (asdf)
  expect(() => createVMManager(build)).toThrow('Unsupported OS or architecture');
});

test('stopCurrentVM: should call kill command with the pid from pidfile', async () => {
  vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce('1234');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.spyOn(extensionApi.process, 'exec').mockResolvedValueOnce({ stdout: '' } as any);

  await stopCurrentVM();
  expect(extensionApi.process.exec).toHaveBeenCalledWith('sh', ['-c', 'kill -9 `cat /tmp/qemu-podman-desktop.pid`']);
});
