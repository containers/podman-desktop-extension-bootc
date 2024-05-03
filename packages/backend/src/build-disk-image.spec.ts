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
import { buildExists, createBuilderImageOptions, getUnusedName } from './build-disk-image';
import { bootcImageBuilderName } from './constants';
import type { ContainerInfo } from '@podman-desktop/api';
import { containerEngine } from '@podman-desktop/api';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import * as fs from 'node:fs';
import { resolve } from 'node:path';

vi.mock('@podman-desktop/api', async () => {
  return {
    env: {
      createTelemetryLogger: vi.fn(),
    },
    containerEngine: {
      listContainers: vi.fn().mockReturnValue([]),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('check image builder options', async () => {
  const name = 'my-image';
  const build = {
    image: 'test-image',
    tag: 'not-latest',
    type: ['raw'],
    arch: 'amd',
    folder: '/output-folder',
  } as BootcBuildInfo;
  const options = createBuilderImageOptions(name, build);

  expect(options).toBeDefined();
  expect(options.name).toEqual(name);
  expect(options.Image).toEqual(bootcImageBuilderName);
  expect(options.HostConfig).toBeDefined();
  if (options.HostConfig?.Binds) {
    expect(options.HostConfig.Binds[0]).toEqual(build.folder + ':/output/');
    expect(options.HostConfig.Binds[1]).toEqual('/var/lib/containers/storage:/var/lib/containers/storage');
  }
  expect(options.Cmd).toEqual([
    build.image + ':' + build.tag,
    '--output',
    '/output/',
    '--local',
    '--type',
    build.type[0],
    '--target-arch',
    build.arch,
  ]);
});

test('check image builder with multiple types', async () => {
  const name = 'my-image';
  const build = {
    image: 'test-image',
    tag: '1.0',
    type: ['raw', 'vmdk'],
    arch: 'amd',
    folder: '/output-folder',
  } as BootcBuildInfo;
  const options = createBuilderImageOptions(name, build);

  expect(options).toBeDefined();
  expect(options.name).toEqual(name);
  expect(options.Image).toEqual(bootcImageBuilderName);
  expect(options.HostConfig).toBeDefined();
  if (options.HostConfig?.Binds) {
    expect(options.HostConfig.Binds[0]).toEqual(build.folder + ':/output/');
    expect(options.HostConfig.Binds[1]).toEqual('/var/lib/containers/storage:/var/lib/containers/storage');
  }
  expect(options.Cmd).toEqual([
    build.image + ':' + build.tag,
    '--output',
    '/output/',
    '--local',
    '--type',
    build.type[0],
    '--type',
    build.type[1],
    '--target-arch',
    build.arch,
  ]);
});

test('check image builder does not include target arch', async () => {
  const build = {
    image: 'test-image',
    type: ['vmdk'],
  } as BootcBuildInfo;
  const options = createBuilderImageOptions('my-image', build);

  expect(options).toBeDefined();
  expect(options.Cmd).not.toContain('--target-arch');
});

test('check image builder includes target arch for iso', async () => {
  const build = {
    image: 'test-image',
    type: ['iso'],
    arch: 'amd',
  } as BootcBuildInfo;
  const options = createBuilderImageOptions('my-image', build);

  expect(options).toBeDefined();
  expect(options.Cmd).toContain('--target-arch');
});

test('check that if xfs is passed into filesystem, it is included in the command', async () => {
  const build = {
    image: 'test-image',
    type: ['vmdk'],
    arch: 'amd',
    filesystem: 'xfs',
  } as BootcBuildInfo;
  const options = createBuilderImageOptions('my-image', build);

  expect(options).toBeDefined();
  expect(options.Cmd).toContain('--rootfs');
  expect(options.Cmd).toContain(build.filesystem);
});

test('check that if ext4 is passed into the filesystem, it is included in the command', async () => {
  const build = {
    image: 'test-image',
    type: ['vmdk'],
    arch: 'amd',
    filesystem: 'ext4',
  } as BootcBuildInfo;
  const options = createBuilderImageOptions('my-image', build);

  expect(options).toBeDefined();
  expect(options.Cmd).toContain('--rootfs');
  expect(options.Cmd).toContain(build.filesystem);
});

test('test if a fake filesystem foobar is passed into filesystem, it is not included in the command', async () => {
  const build = {
    image: 'test-image',
    type: ['vmdk'],
    arch: 'amd',
    filesystem: 'foobar',
  } as BootcBuildInfo;
  const options = createBuilderImageOptions('my-image', build);

  expect(options).toBeDefined();
  expect(options.Cmd).not.toContain('--rootfs');
});

test('test if blank string is passed into filesystem, it is not included in the command', async () => {
  const build = {
    image: 'test-image',
    type: ['vmdk'],
    arch: 'amd',
    filesystem: '',
  } as BootcBuildInfo;
  const options = createBuilderImageOptions('my-image', build);

  expect(options).toBeDefined();
  expect(options.Cmd).not.toContain('--rootfs');
});

test('check we pick unused container name', async () => {
  const basename = 'test';
  let name = await getUnusedName(basename);
  expect(name).toEqual(basename);

  vi.spyOn(containerEngine, 'listContainers').mockReturnValue([{ Names: ['test'] }] as unknown as Promise<
    ContainerInfo[]
  >);
  name = await getUnusedName(basename);
  expect(name).toEqual(basename + '-2');

  vi.spyOn(containerEngine, 'listContainers').mockReturnValue([
    { Names: ['test'] },
    { Names: ['/test-2'] },
  ] as unknown as Promise<ContainerInfo[]>);
  name = await getUnusedName(basename);
  expect(name).toEqual(basename + '-3');
});

test('check build exists', async () => {
  const folder = '/output';

  // mock two existing builds on disk: qcow2 and vmdk
  const existsList: string[] = [resolve(folder, 'qcow2/disk.qcow2'), resolve(folder, 'vmdk/disk.vmdk')];
  vi.mock('node:fs');
  vi.spyOn(fs, 'existsSync').mockImplementation(f => {
    return existsList.includes(f.toString());
  });

  // vdmk exists
  let exists = await buildExists(folder, ['vmdk']);
  expect(exists).toEqual(true);

  // iso does not
  exists = await buildExists(folder, ['iso']);
  expect(exists).toEqual(false);

  // qcow2 exists
  exists = await buildExists(folder, ['qcow2']);
  expect(exists).toEqual(true);

  // vmdk and iso exists (because of vdmk)
  exists = await buildExists(folder, ['vmdk', 'iso']);
  expect(exists).toEqual(true);

  // iso and raw don't exist
  exists = await buildExists(folder, ['iso', 'raw']);
  expect(exists).toEqual(false);
});
