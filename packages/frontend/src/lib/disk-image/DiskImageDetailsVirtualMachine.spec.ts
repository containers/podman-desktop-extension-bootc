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

import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, test, expect, beforeAll } from 'vitest';
import { bootcClient } from '/@/api/client';
import DiskImageDetailsVirtualMachine from './DiskImageDetailsVirtualMachine.svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

vi.mock('/@/api/client', async () => {
  return {
    rpcBrowser: {
      subscribe: () => {
        return {
          unsubscribe: () => {},
        };
      },
    },
    bootcClient: {
      listHistoryInfo: vi.fn(),
      getConfigurationValue: vi.fn(),
      stopCurrentVM: vi.fn(),
      checkVMLaunchPrereqs: vi.fn(),
      launchVM: vi.fn(),
      isMac: vi.fn(),
      isWindows: vi.fn(),
    },
  };
});

beforeAll(() => {
  (window as any).ResizeObserver = ResizeObserver;
  (window as any).getConfigurationValue = vi.fn().mockResolvedValue(undefined);
  (window as any).matchMedia = vi.fn().mockReturnValue({
    addListener: vi.fn(),
  });

  Object.defineProperty(window, 'matchMedia', {
    value: () => {
      return {
        matches: false,
        addListener: () => {},
        removeListener: () => {},
      };
    },
  });
});

class ResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

test('Render virtual machine terminal window', async () => {
  vi.mocked(bootcClient.getConfigurationValue).mockResolvedValue(14);

  // Use BootcBuildInfo to render the component
  const build = {
    id: 'id1',
    image: 'my-image',
    imageId: 'image-id',
    tag: 'latest',
    engineId: 'podman',
    type: ['ami'],
    folder: '/bootc',
  } as BootcBuildInfo;

  render(DiskImageDetailsVirtualMachine, { build });

  // Wait for 'launchVM' to have been called
  await waitFor(() => {
    expect(bootcClient.launchVM).toHaveBeenCalled();
  });
});

test('Show prereqs message if prereq check fails (returns ANY string)', async () => {
  vi.mocked(bootcClient.checkVMLaunchPrereqs).mockResolvedValue('Prereq check failed');

  const build = {
    id: 'id1',
    image: 'my-image',
    imageId: 'image-id',
    tag: 'latest',
    engineId: 'podman',
    type: ['ami'],
    folder: '/bootc',
  } as BootcBuildInfo;

  render(DiskImageDetailsVirtualMachine, { build });

  // Expect prereq failure to be shown
  await waitFor(() => {
    expect(screen.queryByText('Prereq check failed')).toBeDefined();
  });
});

test('Test failed launched VM showing in render', async () => {
  vi.mocked(bootcClient.checkVMLaunchPrereqs).mockResolvedValue(undefined);
  vi.mocked(bootcClient.launchVM).mockRejectedValue('Failed to launch VM');

  const build = {
    id: 'id1',
    image: 'my-image',
    imageId: 'image-id',
    tag: 'latest',
    engineId: 'podman',
    type: ['ami'],
    folder: '/bootc',
  } as BootcBuildInfo;

  render(DiskImageDetailsVirtualMachine, { build });

  // Expect prereq failure to be shown
  await waitFor(() => {
    expect(screen.queryByText('Failed to launch VM')).toBeDefined();
  });
});
