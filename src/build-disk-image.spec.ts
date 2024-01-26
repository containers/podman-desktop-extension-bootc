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
import { createBuilderImageOptions } from './build-disk-image';
import { bootcImageBuilderName } from './constants';

vi.mock('@podman-desktop/api', async () => {
  return {
    env: {
      createTelemetryLogger: vi.fn(),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('check image builder options', async () => {
  const image = 'test-image';
  const type = 'iso';
  const name = 'my-image';
  const outputFolder = '/output-folder';
  const imagePath = '/output-folder/image-path';
  const options = createBuilderImageOptions(name, image, type, outputFolder, imagePath);

  expect(options).toBeDefined();
  expect(options.name).toEqual(name);
  expect(options.Image).toEqual(bootcImageBuilderName);
  expect(options.HostConfig.Binds[0]).toEqual(outputFolder + ':/output/');
  expect(options.Cmd).toEqual([image, '--type', type, '--output', '/output/']);
});
