/**********************************************************************
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 * * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import { beforeEach, vi, test, expect } from 'vitest';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import { screen, render } from '@testing-library/svelte';
import BootcFolderColumn from './BootcFolderColumn.svelte';

const mockHistoryInfo: BootcBuildInfo = {
  id: 'name1',
  image: 'image1',
  imageId: 'sha256:imageId1',
  engineId: 'engine1',
  tag: 'latest',
  type: ['anaconda-iso'],
  folder: '/foo/image1',
  arch: 'x86_64',
  status: 'running',
};

vi.mock('../api/client', async () => {
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
  vi.clearAllMocks();
});

test('Expect to render folder column with a button to open the folder', async () => {
  render(BootcFolderColumn, { object: mockHistoryInfo });

  const folder = screen.getByText('/foo/image1');
  expect(folder).not.toBeNull();

  // Expect button to be there with a link to the build
  expect(screen.getByRole('link', { name: '/foo/image1' })).not.toBeNull();
});
