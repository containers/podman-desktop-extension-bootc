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

import { render, screen, waitFor } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import type { ExamplesList } from '/@shared/src/models/examples';
import type { ImageInfo } from '@podman-desktop/api';

import Examples from './Examples.svelte';
import { bootcClient } from './api/client';
import { tick } from 'svelte';

vi.mock('./api/client', async () => {
  return {
    bootcClient: {
      getExamples: vi.fn(),
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

// Create a mock ExamplesList
const examplesList: ExamplesList = {
  examples: [
    {
      id: 'example1',
      name: 'Example 1',
      categories: ['Category 1'],
      description: 'Description 1',
      repository: 'https://example.com/example1',
      image: 'quay.io/example/example1',
      tag: 'latest',
    },
    {
      id: 'example2',
      name: 'Example 2',
      categories: ['Category 2'],
      description: 'Description 2',
      repository: 'https://example.com/example2',
      image: 'quay.io/example/example2',
      tag: 'latest',
    },
  ],
  categories: [
    {
      id: 'Category 1',
      name: 'Category 1',
    },
    {
      id: 'Category 2',
      name: 'Category 2',
    },
  ],
};

// Mock the list of images returned, make sure example1 is in it, only mock the RepoTags since that is what is used / checked and nothing else
const imagesList = [
  {
    RepoTags: ['quay.io/example/example1:latest'],
  },
] as ImageInfo[];

test('Test examples render correctly', async () => {
  // Mock the getExamples method
  vi.mocked(bootcClient.getExamples).mockResolvedValue(examplesList);

  // Render the examples component
  render(Examples);

  // Wait for 2 examples to appear, aria-label="Example 1" and aria-label="Example 2"
  await screen.findByLabelText('Example 1');
  await screen.findByLabelText('Example 2');

  // Confirm example 1 and 2 exist
  const example1 = screen.getByLabelText('Example 1');
  expect(example1).toBeInTheDocument();
  const example2 = screen.getByLabelText('Example 2');
  expect(example2).toBeInTheDocument();
});

test('Test examples correctly marks examples either Pull image or Build image depending on availability', async () => {
  // Mock the getExamples method
  vi.mocked(bootcClient.getExamples).mockResolvedValue(examplesList);

  // Mock image list has example1 in it (button should be Build Image instead of Pull Image)
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(imagesList);

  // Render the examples component
  render(Examples);

  // Wait for aria-label aria-label="Example 1" to appear
  await screen.findByLabelText('Example 1');

  // Confirm that the example 1 is rendered
  const example1 = screen.getByLabelText('Example 1');
  expect(example1).toBeInTheDocument();

  // Confirm example 2 is rendered
  const example2 = screen.getByLabelText('Example 2');
  expect(example2).toBeInTheDocument();

  // Use the tick function to wait for the next render (updating pulled state)
  await tick();

  // Wait until example1 says Build image as it updates reactively
  // same for example 2 but Pull image
  await waitFor(() => {
    const buildImage1 = example1.querySelector('[aria-label="Build image"]');
    expect(buildImage1).toBeInTheDocument();
  });

  await waitFor(() => {
    const pullImage2 = example2.querySelector('[aria-label="Pull image"]');
    expect(pullImage2).toBeInTheDocument();
  });
});
