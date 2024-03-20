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
import BootcCurrentProgress from './BootcCurrentProgress.svelte';

const mockHistoryInfo: BootcBuildInfo = {
  name: 'image1',
  engineId: 'engine1',
  tag: 'latest',
  type: 'iso',
  folder: '/tmp/image1',
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

test('Expect to render current progress and with a link to the build', async () => {
  render(BootcCurrentProgress, { object: mockHistoryInfo });

  const progress = screen.getByText('Building');
  expect(progress).not.toBeNull();

  // Expect button to be there with a link to the build
  expect(screen.getByRole('button', { name: '(view logs)' })).not.toBeNull();
});
