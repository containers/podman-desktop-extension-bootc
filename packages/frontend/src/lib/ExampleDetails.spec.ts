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
import { render, fireEvent, screen } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import ExampleDetails from './ExampleDetails.svelte';
import { bootcClient } from '../api/client';
import { router } from 'tinro';
import type { Example } from '/@shared/src/models/examples';

// Mock bootcClient methods
vi.mock('/@/api/client', () => {
  return {
    bootcClient: {
      getExamples: vi.fn(),
      openLink: vi.fn(),
    },
  };
});

// Mock router
vi.mock('tinro', () => {
  return {
    router: {
      goto: vi.fn(),
    },
  };
});

// Sample example data for testing
const example = {
  id: 'example1',
  name: 'Example 1',
  categories: ['category1'],
  description: 'Description 1',
  repository: 'https://example.com/example1',
  readme: '# Example Markdown Readme Text',
} as Example;

test('renders ExampleDetails with correct content', async () => {
  // Mock getExamples to return the test example data
  vi.mocked(bootcClient.getExamples).mockResolvedValue({
    examples: [example],
    categories: [{ id: 'category1', name: 'category1' }],
  });

  // Render the component with the example ID prop
  render(ExampleDetails, { id: 'example1' });

  // Wait until Example 1 to appear
  await screen.findByLabelText('Example 1');

  // Make sure that Example 1 exists
  const exampleName = screen.getByLabelText('Example 1');
  expect(exampleName).toBeInTheDocument();

  // Make sure that Markdown is rendered
  const readme = screen.getByText('Example Markdown Readme Text');
  expect(readme).toBeInTheDocument();

  // Check that when clicking "More Details" button the openLink method is called
  const moreDetailsButton = screen.getByRole('button', { name: 'More Details' });
  await fireEvent.click(moreDetailsButton);
  expect(bootcClient.openLink).toHaveBeenCalledWith('https://example.com/example1');
});

test('redirects to /examples when "Go back to Examples" is clicked', async () => {
  render(ExampleDetails, { id: 'example1' });

  // Find and click the breadcrumb link to go back
  const breadcrumbLink = screen.getByText('Examples');
  await fireEvent.click(breadcrumbLink);

  // Verify the router.goto method is called with the correct path
  expect(router.goto).toHaveBeenCalledWith('/examples');
});
