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
import { expect, test } from 'vitest';

import BootcStatusIcon from './BootcStatusIcon.svelte'; // Adjust the import path as necessary

test('Expect running status to display correct background color', async () => {
  const status = 'running';
  render(BootcStatusIcon, { status });
  const icon = screen.getByRole('status');
  expect(icon).toBeInTheDocument();
  expect(icon).toHaveAttribute('title', status);
  expect(icon).toHaveClass('bg-sky-400');
});

test('Expect success status to display green background', async () => {
  const status = 'success';
  render(BootcStatusIcon, { status });
  const icon = screen.getByRole('status');
  expect(icon).toBeInTheDocument();
  expect(icon).toHaveAttribute('title', status);
  expect(icon).toHaveClass('bg-green-600');
});

test('Expect error status to display red background', async () => {
  const status = 'error';
  render(BootcStatusIcon, { status });
  const icon = screen.getByRole('status');
  expect(icon).toBeInTheDocument();
  expect(icon).toHaveAttribute('title', status);
  expect(icon).toHaveClass('bg-red-600');
});

test('If running, creating or deleting, expect an svg which is the spinner', async () => {
  const status = 'running';
  render(BootcStatusIcon, { status });
  const icon = screen.getByRole('status');
  expect(icon).toBeInTheDocument();
  expect(icon).toContainHTML('<svg');
});

test('Expect lost status to display amber background', async () => {
  const status = 'lost';
  render(BootcStatusIcon, { status });
  const icon = screen.getByRole('status');
  expect(icon).toBeInTheDocument();
  expect(icon).toHaveAttribute('title', status);
  expect(icon).toHaveClass('bg-amber-600');
});
