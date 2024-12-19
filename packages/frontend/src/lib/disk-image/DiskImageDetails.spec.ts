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
import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';
import { bootcClient } from '/@/api/client';

import DiskImageDetails from './DiskImageDetails.svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import { tick } from 'svelte';

const image: BootcBuildInfo = {
  id: 'id1',
  image: 'my-image',
  imageId: 'image-id',
  tag: 'latest',
  engineId: 'podman',
  type: ['ami'],
  folder: '/bootc',
};

vi.mock('/@/api/client', async () => {
  return {
    bootcClient: {
      listHistoryInfo: vi.fn(),
      isWindows: vi.fn(),
    },
    rpcBrowser: {
      subscribe: () => {
        return {
          unsubscribe: () => {},
        };
      },
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('Confirm renders disk image details', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue([image]);
  vi.mocked(bootcClient.isWindows).mockResolvedValue(false);

  render(DiskImageDetails, { id: btoa(image.id) });

  // allow UI time to update
  await tick();

  expect(screen.getByText(image.image + ':' + image.tag)).toBeInTheDocument();
});
