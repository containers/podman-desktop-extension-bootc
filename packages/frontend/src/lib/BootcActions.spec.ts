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
import { bootcClient } from '../api/client';
import { screen, render } from '@testing-library/svelte';
import BootcActions from './BootcActions.svelte';

vi.mock('../api/client', async () => {
  return {
    bootcClient: {
      deleteBuilds: vi.fn(),
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

const mockHistoryInfo: BootcBuildInfo = {
  id: 'name1',
  image: 'image1',
  imageId: 'sha256:imageId1',
  engineId: 'engine1',
  tag: 'latest',
  type: ['iso'],
  folder: '/tmp/image1',
  arch: 'x86_64',
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('Renders Delete Build button', async () => {
  render(BootcActions, { object: mockHistoryInfo });

  const deleteButton = screen.getAllByRole('button', { name: 'Delete Build' })[0];
  expect(deleteButton).not.toBeNull();
});

test('Test clicking on delete button', async () => {
  render(BootcActions, { object: mockHistoryInfo });

  // spy on deleteBuild function
  const spyOnDelete = vi.spyOn(bootcClient, 'deleteBuilds');

  // Click on delete button
  const deleteButton = screen.getAllByRole('button', { name: 'Delete Build' })[0];
  deleteButton.click();

  expect(spyOnDelete).toHaveBeenCalled();
});
