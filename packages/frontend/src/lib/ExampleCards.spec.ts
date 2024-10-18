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
import type { Example, Category } from '../../../shared/src/models/examples';
import ExamplesCard from './ExamplesCard.svelte';
import { bootcClient } from '../api/client';
import { tick } from 'svelte';
import type { ImageInfo } from '@podman-desktop/api';

// Mock bootcClient methods
vi.mock('../api/client', () => {
  return {
    bootcClient: {
      listBootcImages: vi.fn(),
    },
    rpcBrowser: {
      subscribe: vi.fn().mockReturnValue({
        unsubscribe: vi.fn(),
      }),
    },
  };
});

// Mock category and examples data
const category: Category = {
  id: 'category1',
  name: 'Category 1',
};

const examples: Example[] = [
  {
    id: 'example1',
    name: 'Example 1',
    description: 'Description 1',
    repository: 'https://example.com/example1',
    image: 'quay.io/example/example1',
    tag: 'latest',
    categories: ['Category 1'],
    state: 'unpulled',
    architectures: ['amd64'],
  },
  {
    id: 'example2',
    name: 'Example 2',
    description: 'Description 2',
    repository: 'https://example.com/example2',
    image: 'quay.io/example/example2',
    tag: 'latest',
    categories: ['Category 1'],
    state: 'unpulled',
    architectures: ['amd64'],
  },
];

// Mock listBootcImages response to simulate available images
const imagesList = [
  {
    RepoTags: ['quay.io/example/example1:latest'],
  },
] as ImageInfo[];

test('renders ExamplesCard with correct content', async () => {
  // Mock the listBootcImages method
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(imagesList);

  // Render the ExamplesCard component with category and examples props
  render(ExamplesCard, { props: { category, examples } });

  // Verify category name is displayed
  const categoryName = screen.getByText('Category 1');
  expect(categoryName).toBeInTheDocument();

  // Verify example names are displayed
  const example1 = screen.getByText('Example 1');
  expect(example1).toBeInTheDocument();

  const example2 = screen.getByText('Example 2');
  expect(example2).toBeInTheDocument();
});

test('updates example state to "pulled" when images are available', async () => {
  // Mock the listBootcImages method
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(imagesList);

  // Render the ExamplesCard component with category and examples props
  render(ExamplesCard, { props: { category, examples } });

  // Use tick to wait for the next render (update the state)
  await tick();

  // Verify that example1 has been updated to state "pulled"
  const buildButton = screen.getByTitle('Build image');
  expect(buildButton).toBeInTheDocument();

  // Verify example2 still says "Pull image" since it's not in the list of available images
  const pullButton = screen.getByTitle('Pull image');
  expect(pullButton).toBeInTheDocument();
});

test('displays message when there are no examples in the category', async () => {
  // Render the ExamplesCard component with empty examples array
  render(ExamplesCard, { props: { category, examples: [] } });

  // Verify the message is displayed
  const noExamplesMessage = screen.getByText('There is no example in this category.');
  expect(noExamplesMessage).toBeInTheDocument();
});
