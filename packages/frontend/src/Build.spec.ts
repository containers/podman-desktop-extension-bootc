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

import { vi, test, expect } from 'vitest';
import { screen, render } from '@testing-library/svelte';
import Build from './Build.svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import type { ImageInfo } from '@podman-desktop/api';
import { bootcClient } from './api/client';

const mockHistoryInfo: BootcBuildInfo[] = [
  {
    id: 'name1',
    image: 'image1',
    engineId: 'engine1',
    tag: 'latest',
    type: ['iso'],
    folder: '/tmp/image1',
    arch: 'x86_64',
  },
  {
    id: 'name2',
    image: 'image2',
    engineId: 'engine2',
    tag: 'latest',
    type: ['iso'],
    folder: '/tmp/image1',
    arch: 'x86_64',
  },
];

// Mocked bootc images, with one containing the 'bootc' and 'containers.bootc' labels, and the other not
const mockBootcImages: ImageInfo[] = [
  {
    Id: 'image1',
    RepoTags: ['image1:latest'],
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
  },
  {
    Id: 'image2',
    RepoTags: ['image2:latest'],
    Labels: {
      bootc: 'true',
    },
    engineId: 'engine2',
    engineName: 'engine2',
    ParentId: 'parent2',
    Created: 0,
    VirtualSize: 0,
    Size: 0,
    Containers: 0,
    SharedSize: 0,
  },
];

vi.mock('./api/client', async () => {
  return {
    bootcClient: {
      checkPrereqs: vi.fn(),
      buildExists: vi.fn(),
      listHistoryInfo: vi.fn(),
      listBootcImages: vi.fn(),
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

async function waitRender(customProperties?: object): Promise<void> {
  const result = render(Build, { ...customProperties });
  // wait that result.component.$$.ctx[2] is set
  while (result.component.$$.ctx[2] === undefined) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

test('Render shows correct images and history', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  await waitRender();

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  while (screen.getByLabelText('image-select')?.children.length !== 2) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const select = screen.getByLabelText('image-select');
  expect(select).toBeDefined();
  expect(select.children.length).toEqual(2);

  // Expect image:1 to be first since it's the last one in the history
  expect(select.children[0].textContent).toEqual('image1:latest');
  expect(select.children[1].textContent).toEqual('image2:latest');

  // Expect input iso to be selected (it would have bg-purple-500 class)
  const iso = screen.getByLabelText('iso-select');
  expect(iso).toBeDefined();
  expect(iso.classList.contains('bg-purple-500'));

  // Expect input amd64 to be selected (it would have bg-purple-500 class)
  const x86_64 = screen.getByLabelText('amd64-select');
  expect(x86_64).toBeDefined();
  expect(x86_64.classList.contains('bg-purple-500'));

  // Expect input /tmp/image1 to be selected (it would have bg-purple-500 class)
  const folder = screen.getByLabelText('folder-select');
  expect(folder).toBeDefined();

  //  expect(folder.value).toBe('/tmp/image1');
  // but use isIsnstanceIf for checking
  expect(folder).toBeInstanceOf(HTMLInputElement);
});

test('Check that VMDK option is there', async () => {
  await waitRender();
  const vmdk = screen.getByLabelText('vmdk-select');
  expect(vmdk).toBeDefined();
});

test('Check that preselecting an image works', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  await waitRender({ imageName: 'image2', imageTag: 'latest' });

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  while (screen.getByLabelText('image-select')?.children.length !== 2) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const select = screen.getByLabelText('image-select') as HTMLSelectElement;
  expect(select).toBeDefined();
  expect(select.children.length).toEqual(2);

  // Expect image:1 to be first since it's the last one in the history
  expect(select.children[0].textContent).toEqual('image1:latest');
  expect(select.children[1].textContent).toEqual('image2:latest');

  // Expect the one we passed in to be selected
  const selectedImage = select.value as unknown as any[];
  expect(selectedImage).toBeDefined();
  expect(selectedImage).toEqual('image2:latest');
});

test('Check that prereq validation works', async () => {
  const prereq = 'Something is missing';
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(prereq);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);

  await waitRender();

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  while (screen.getByLabelText('image-select')?.children.length !== 2) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // select an option to trigger validation
  const raw = screen.getByLabelText('raw-select');
  raw.click();

  const validation = screen.getByLabelText('validation');
  expect(validation).toBeDefined();
  expect(validation.textContent).toEqual(prereq);
});

test('Check that overwriting an existing build works', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(true);

  await waitRender({ imageName: 'image2', imageTag: 'latest' });

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  while (screen.getByLabelText('image-select')?.children.length !== 2) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const overwrite = screen.getByLabelText('Overwrite existing build');
  expect(overwrite).toBeDefined();
  const overwrite2 = screen.getByLabelText('overwrite-select');
  expect(overwrite2).toBeDefined();

  const validation = screen.getByLabelText('validation');
  expect(validation).toBeDefined();
  expect(validation.textContent).toEqual('Confirm overwriting existing build');

  // select the checkbox and give it time to validate
  overwrite2.click();
  await new Promise(resolve => setTimeout(resolve, 100));

  const validation2 = screen.queryByLabelText('validation');
  expect(validation2).toBeNull();
});
