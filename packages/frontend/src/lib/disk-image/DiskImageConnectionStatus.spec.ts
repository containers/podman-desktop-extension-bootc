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

import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { test, expect } from 'vitest';
import DiskImageConnectionStatus from './DiskImageConnectionStatus.svelte';

test('Expect to show connection status if status is connected', async () => {
  render(DiskImageConnectionStatus, { status: 'connected' });

  // Find span element with connected status
  expect(screen.getByText('connected')).toBeDefined();

  // Find status element, use the inner div of that element to check if it includes bg-[var(--pd-status-connected)]
  const statusElement = screen.getByRole('status');
  if (!statusElement) {
    throw new Error('Status element not found');
  }
  const innerDiv = statusElement.querySelector('div');
  if (!innerDiv) {
    throw new Error('Inner div not found');
  }
  expect(innerDiv.classList.contains('bg-[var(--pd-status-connected)]')).toBeDefined();
});

test('Expect to show disconnected status if VM error passed in', async () => {
  render(DiskImageConnectionStatus, { status: 'VM error' });

  // Find span element with connected status
  expect(screen.getByText('VM error')).toBeDefined();

  // Find status element, use the inner div of that element to check if it includes bg-[var(--pd-status-disconnected)]
  const statusElement = screen.getByRole('status');
  if (!statusElement) {
    throw new Error('Status element not found');
  }
  const innerDiv = statusElement.querySelector('div');
  if (!innerDiv) {
    throw new Error('Inner div not found');
  }
  expect(innerDiv.classList.contains('bg-[var(--pd-status-disconnected)]')).toBeDefined();
});
