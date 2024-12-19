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
import ExampleCard from './ExampleCard.svelte';
import { bootcClient } from '/@/api/client';
import { router } from 'tinro';
import type { Example, ExampleState } from '/@shared/src/models/examples';

// Mock bootcClient methods
vi.mock('../api/client', () => {
  return {
    bootcClient: {
      pullImage: vi.fn(),
      openLink: vi.fn(),
      telemetryLogUsage: vi.fn(),
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

// Example object to be used in tests
const example = {
  id: 'example1',
  name: 'Example 1',
  description: 'Description 1',
  repository: 'https://example.com/example1',
  categories: ['Category 1'],
  image: 'quay.io/example/example1',
  tag: 'latest',
  architectures: ['amd64'],
  state: 'unpulled',
} as Example;

test('renders ExampleCard with correct content', async () => {
  // Render the component with the example prop
  render(ExampleCard, { props: { example } });

  // Verify example name and description are displayed
  const exampleName = screen.getByText('Example 1');
  expect(exampleName).toBeInTheDocument();

  const exampleDescription = screen.getByText('Description 1');
  expect(exampleDescription).toBeInTheDocument();

  // Verify architectures are displayed
  const architectureText = screen.getByText('amd64');
  expect(architectureText).toBeInTheDocument();
});

test('redirection to /example/:id is called when More details button is clicked', async () => {
  // Render the component with the example prop
  render(ExampleCard, { props: { example } });

  // Find and click the "More details" button
  const detailsButton = screen.getByTitle('More Details');
  await fireEvent.click(detailsButton);

  // Ensure the router.goto is called with the correct path
  expect(router.goto).toHaveBeenCalledWith('/example/example1');
});

test('pullImage function is called when Pull image button is clicked', async () => {
  // Render the component with the example prop (state is 'unpulled')
  render(ExampleCard, { props: { example } });

  // Find and click the "Pull image" button
  const pullButton = screen.getByTitle('Pull image');

  await fireEvent.click(pullButton);

  // Ensure bootcClient.pullImage is called with the correct image name
  expect(bootcClient.pullImage).toHaveBeenCalledWith('quay.io/example/example1');

  expect(bootcClient.telemetryLogUsage).toHaveBeenCalled();
});

test('Build image button is displayed if example is pulled', async () => {
  // Modify example state to 'pulled'
  const pulledExample = { ...example, state: 'pulled' as ExampleState };

  // Render the component with the pulled example prop
  render(ExampleCard, { props: { example: pulledExample } });

  // Ensure the "Build image" button is displayed
  const buildButton = screen.getByTitle('Build image');
  expect(buildButton).toBeInTheDocument();

  // Click the "Build image" button
  await fireEvent.click(buildButton);

  // Ensure the router.goto is called with the correct path
  expect(router.goto).toHaveBeenCalledWith('/disk-images/build/quay.io%2Fexample%2Fexample1/latest');

  expect(bootcClient.telemetryLogUsage).toHaveBeenCalled();
});
