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
import os from 'node:os';
import {
  buildExists,
  createBuilderImageOptions,
  createPodmanCLIRunCommand,
  getBuilder,
  getUnusedName,
} from './build-disk-image';
import { bootcImageBuilderCentos, bootcImageBuilderRHEL } from './constants';
import type { ContainerInfo, Configuration } from '@podman-desktop/api';
import { containerEngine } from '@podman-desktop/api';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import * as fs from 'node:fs';
import path, { resolve } from 'node:path';

const configurationGetConfigurationMock = vi.fn();

const config: Configuration = {
  get: configurationGetConfigurationMock,
  has: () => true,
  update: vi.fn(),
};

vi.mock('@podman-desktop/api', async () => {
  return {
    env: {
      createTelemetryLogger: vi.fn(),
    },
    containerEngine: {
      listContainers: vi.fn().mockReturnValue([]),
    },
    configuration: {
      getConfiguration: () => config,
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
  expect(options.Image).toEqual(bootcImageBuilderCentos);
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
  expect(options.Image).toEqual(bootcImageBuilderCentos);
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

test('test specified builder is used', async () => {
  const builder = 'foo-builder';
  const build = {
    image: 'test-image',
    type: ['vmdk'],
  } as BootcBuildInfo;
  const options = createBuilderImageOptions('my-image', build, builder);

  expect(options).toBeDefined();
  expect(options.Image).toEqual(builder);
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

test('check uses RHEL builder', async () => {
  configurationGetConfigurationMock.mockReturnValue('RHEL');

  const builder = await getBuilder();

  expect(builder).toBeDefined();
  expect(builder).toEqual(bootcImageBuilderRHEL);
});

test('check uses Centos builder', async () => {
  configurationGetConfigurationMock.mockReturnValue('CentOS');

  const builder = await getBuilder();

  expect(builder).toBeDefined();
  expect(builder).toEqual(bootcImageBuilderCentos);
});

test('create podman run CLI command', async () => {
  const name = 'test123-bootc-image-builder';
  const build = {
    image: 'test-image',
    tag: 'latest',
    type: ['raw'],
    arch: 'amd64',
    folder: '/Users/cdrage/bootc/qemutest4',
  } as BootcBuildInfo;

  const options = createBuilderImageOptions(name, build);
  const command = createPodmanCLIRunCommand(options);

  // Expect an array of the above
  const expectedCommand = [
    'podman',
    'run',
    '--rm',
    '--name',
    'test123-bootc-image-builder',
    '--tty',
    '--privileged',
    '--security-opt',
    'label=type:unconfined_t',
    '-v',
    '/Users/cdrage/bootc/qemutest4:/output/',
    '-v',
    '/var/lib/containers/storage:/var/lib/containers/storage',
    '--label',
    'bootc.image.builder=true',
    bootcImageBuilderCentos,
    'test-image:latest',
    '--output',
    '/output/',
    '--local',
    '--type',
    'raw',
    '--target-arch',
    'amd64',
  ];

  expect(command).toEqual(expectedCommand);
});

test('expect aws options to be included in the command for volume and paramters', async () => {
  const name = 'test123-bootc-image-builder';
  const build = {
    image: 'test-image',
    tag: 'latest',
    type: ['raw'],
    arch: 'amd64',
    folder: '/Users/cdrage/bootc/qemutest4',
    awsBucket: 'test-bucket',
    awsRegion: 'us-west-2',
    awsAmiName: 'test-ami',
  } as BootcBuildInfo;

  const options = createBuilderImageOptions(name, build);

  expect(options).toBeDefined();
  expect(options.HostConfig).toBeDefined();
  expect(options.HostConfig?.Binds).toBeDefined();
  if (options.HostConfig?.Binds) {
    expect(options.HostConfig.Binds[0]).toEqual(build.folder + ':/output/');
    expect(options.HostConfig.Binds[1]).toEqual('/var/lib/containers/storage:/var/lib/containers/storage');
    expect(options.HostConfig.Binds[2]).toEqual(path.join(os.homedir(), '.aws') + ':/root/.aws:ro');
  }

  // Check that the aws options are included in the command
  expect(options.Cmd).toContain('--aws-bucket');
  expect(options.Cmd).toContain(build.awsBucket);
  expect(options.Cmd).toContain('--aws-region');
  expect(options.Cmd).toContain(build.awsRegion);
  expect(options.Cmd).toContain('--aws-ami-name');
  expect(options.Cmd).toContain(build.awsAmiName);
});

test('test that if aws options are not provided, they are NOT included in the command', async () => {
  const name = 'test123-bootc-image-builder';
  const build = {
    image: 'test-image',
    tag: 'latest',
    type: ['raw'],
    arch: 'amd64',
    folder: '/Users/cdrage/bootc/qemutest4',
  } as BootcBuildInfo;

  const options = createBuilderImageOptions(name, build);

  expect(options).toBeDefined();
  expect(options.HostConfig).toBeDefined();
  expect(options.HostConfig?.Binds).toBeDefined();
  if (options.HostConfig?.Binds) {
    // Expect the length to ONLY be two. The first bind is the output folder, the second is the storage folder
    expect(options.HostConfig.Binds.length).toEqual(2);
    expect(options.HostConfig.Binds[0]).toEqual(build.folder + ':/output/');
    expect(options.HostConfig.Binds[1]).toEqual('/var/lib/containers/storage:/var/lib/containers/storage');
  }

  // Check that the aws options are NOT included in the command
  expect(options.Cmd).not.toContain('--aws-bucket');
  expect(options.Cmd).not.toContain('--aws-region');
  expect(options.Cmd).not.toContain('--aws-ami-name');
});

test('test if build config toml passed in, it will work', async () => {
  const name = 'test123-bootc-image-builder';
  const build = {
    image: 'test-image',
    tag: 'latest',
    type: ['raw'],
    arch: 'amd64',
    folder: '/tmp/foo/bar/qemutest4',
    buildConfigFilePath: '/tmp/foo/bar/baz/config.toml',
  } as BootcBuildInfo;

  const options = createBuilderImageOptions(name, build);

  expect(options).toBeDefined();
  expect(options.HostConfig).toBeDefined();
  expect(options.HostConfig?.Binds).toBeDefined();
  if (options.HostConfig?.Binds) {
    expect(options.HostConfig.Binds.length).toEqual(3);
    expect(options.HostConfig.Binds[0]).toEqual(build.folder + ':/output/');
    expect(options.HostConfig.Binds[1]).toEqual('/var/lib/containers/storage:/var/lib/containers/storage');
    expect(options.HostConfig.Binds[2]).toEqual(build.buildConfigFilePath + ':/config.toml:ro');
  }
});

test('test build config json passed in', async () => {
  const name = 'test123-bootc-image-builder';
  const build = {
    image: 'test-image',
    tag: 'latest',
    type: ['raw'],
    arch: 'amd64',
    folder: '/tmp/foo/bar/qemutest4',
    buildConfigFilePath: '/tmp/foo/bar/baz/config.json',
  } as BootcBuildInfo;

  const options = createBuilderImageOptions(name, build);

  expect(options).toBeDefined();
  expect(options.HostConfig).toBeDefined();
  expect(options.HostConfig?.Binds).toBeDefined();
  if (options.HostConfig?.Binds) {
    expect(options.HostConfig.Binds.length).toEqual(3);
    expect(options.HostConfig.Binds[0]).toEqual(build.folder + ':/output/');
    expect(options.HostConfig.Binds[1]).toEqual('/var/lib/containers/storage:/var/lib/containers/storage');
    expect(options.HostConfig.Binds[2]).toEqual(build.buildConfigFilePath + ':/config.json:ro');
  }
});

test('test chown works when passed into createBuilderImageOptions', async () => {
  const name = 'test123-bootc-image-builder';
  const build = {
    image: 'test-image',
    tag: 'latest',
    type: ['raw'],
    arch: 'amd64',
    folder: '/tmp/foo/bar/qemutest4',
    chown: '1000:1000',
  } as BootcBuildInfo;

  const options = createBuilderImageOptions(name, build);

  expect(options).toBeDefined();
  expect(options.HostConfig).toBeDefined();
  expect(options.HostConfig?.Binds).toBeDefined();
  if (options.HostConfig?.Binds) {
    expect(options.HostConfig.Binds.length).toEqual(2);
    expect(options.HostConfig.Binds[0]).toEqual(build.folder + ':/output/');
    expect(options.HostConfig.Binds[1]).toEqual('/var/lib/containers/storage:/var/lib/containers/storage');
  }
  expect(options.Cmd).toContain('--chown');
  expect(options.Cmd).toContain(build.chown);
});
