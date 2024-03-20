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
import { createBuilderImageOptions, getUnusedName } from './build-disk-image';
import { bootcImageBuilderName } from './constants';
import type { ContainerInfo } from '@podman-desktop/api';
import { containerEngine } from '@podman-desktop/api';

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
  const image = 'test-image';
  const type = 'iso';
  const arch = 'amd';
  const name = 'my-image';
  const outputFolder = '/output-folder';
  const imagePath = '/output-folder/image-path';
  const options = createBuilderImageOptions(name, image, type, arch, outputFolder, imagePath);

  expect(options).toBeDefined();
  expect(options.name).toEqual(name);
  expect(options.Image).toEqual(bootcImageBuilderName);
  expect(options.HostConfig).toBeDefined();
  if (options.HostConfig?.Binds) {
    expect(options.HostConfig.Binds[0]).toEqual(outputFolder + ':/output/');
    expect(options.HostConfig.Binds[1]).toEqual('/var/lib/containers/storage:/var/lib/containers/storage');
  }
  expect(options.Cmd).toEqual([image, '--type', type, '--target-arch', arch, '--output', '/output/', '--local']);
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
