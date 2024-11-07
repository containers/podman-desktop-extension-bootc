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

import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import DiskImageDetailsSummary from './DiskImageDetailsSummary.svelte';

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
  vi.resetAllMocks();
  vi.clearAllMocks();
});

test('Expect to show image summary', async () => {
  render(DiskImageDetailsSummary, { image: image });

  expect(screen.getByText(image.image + ':' + image.tag)).toBeInTheDocument();
  expect(screen.getByText(image.type[0])).toBeInTheDocument();
  expect(screen.getByText(image.folder)).toBeInTheDocument();
});
