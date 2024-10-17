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
import { expect, test, vi } from 'vitest';
import { bootcClient } from '../../api/client';
import Dashboard from './Dashboard.svelte';
import type { ImageInfo } from '@podman-desktop/api';

const exampleTestImage = `quay.io/bootc-extension/httpd:latest`;

const mockBootcImages: ImageInfo[] = [
  {
    Id: 'quay.io/bootc-extension/httpd',
    RepoTags: [exampleTestImage],
    Labels: {
      bootc: 'true',
    },
    engineId: 'engine1',
    engineName: 'engine1',
    ParentId: 'parent1',
    Created: 0,
    VirtualSize: 0,
    Size: 0,
    Containers: 0,
    SharedSize: 0,
    Digest: 'sha256:1234567890abcdef',
  },
];

vi.mock('../../api/client', async () => {
  return {
    bootcClient: {
      listHistoryInfo: vi.fn(),
      listBootcImages: vi.fn(),
      pullImage: vi.fn(),
      isMac: vi.fn(),
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

test('Expect basic dashboard', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue([]);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue([]);
  render(Dashboard);

  const noDeployments = screen.getByRole('heading', { name: 'Welcome to Bootable Containers' });
  expect(noDeployments).toBeInTheDocument();
});

test('Expect build image button if example image does not exist', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue([]);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  render(Dashboard);

  // Wait until the "Pull image" button disapears
  await vi.waitFor(() => {
    if (screen.queryAllByRole('button', { name: 'Pull image' }).length === 1) {
      throw new Error();
    }
  });

  // Build image exists since there is the example image in our mocked mockBootcImages
  const buildImage = screen.getByRole('button', { name: 'Build image' });
  expect(buildImage).toBeInTheDocument();
});

test('Expect pull image button if example image does not exist', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue([]);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue([]);
  render(Dashboard);

  // Wait until the "Build image" button disappears
  await vi.waitFor(() => {
    if (screen.queryAllByRole('button', { name: 'Build image' }).length === 1) {
      throw new Error();
    }
  });

  // Pull image exists since there is no image in our mocked mockBootcImages
  const pullImage = screen.getByRole('button', { name: 'Pull image' });
  expect(pullImage).toBeInTheDocument();
});

test('Clicking on Pull image button should call bootcClient.pullImage', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue([]);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue([]);
  render(Dashboard);

  const pullImage = screen.getByRole('button', { name: 'Pull image' });
  pullImage.click();
  expect(bootcClient.pullImage).toHaveBeenCalled();
});
