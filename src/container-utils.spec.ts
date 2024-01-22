/**********************************************************************
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import { beforeEach, expect, test, vi } from 'vitest';
import * as extensionApi from '@podman-desktop/api';
import {
  getContainerEngine,
  pullImage,
  createAndStartContainer,
  waitForContainerToExit,
  removeContainerIfExists,
} from './container-utils';

// Mocks and utilities
vi.mock('@podman-desktop/api', async () => {
  return {
    containerEngine: {
      pullImage: vi.fn(),
      createContainer: vi.fn(),
      listContainers: vi.fn(),
      deleteContainer: vi.fn(),
    },
    provider: {
      getContainerConnections: vi.fn(() => [
        // Mocked container connections
        {
          connection: {
            type: 'podman',
            status: () => 'started',
          },
        },
      ]),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('getContainerEngine should return a running podman engine', async () => {
  const engine = await getContainerEngine();
  expect(engine).toBeDefined();
  expect(engine.type).toBe('podman');
});

test('pullImage should call pullImage from containerEngine', async () => {
  await pullImage('someImage');
  expect(extensionApi.containerEngine.pullImage).toBeCalled();
});

// Test createAndStartContainer
test('createAndStartContainer should create and return container ID', async () => {
  const createContainerMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).createContainer = createContainerMock;

  createContainerMock.mockResolvedValue({ id: '1234' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerId = await createAndStartContainer('', {} as any);
  expect(containerId).toBe('1234');
});

// Test waitForContainerToExit
test('waitForContainerToExit should wait for container to exit', async () => {
  const listContainersMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).listContainers = listContainersMock;
  listContainersMock.mockResolvedValue([{ Names: '1234', Id: '1234', State: 'exited', Status: 'Exited (0)' }]);

  await expect(waitForContainerToExit('1234')).resolves.toBeUndefined();
});

// Test removeContainerIfExists
test('removeContainerIfExists should remove existing container', async () => {
  const listContainersMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).listContainers = listContainersMock;
  listContainersMock.mockResolvedValue([{ Names: '/1234' }]);

  const deleteContainerMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).deleteContainer = deleteContainerMock;

  await removeContainerIfExists('', '1234');
  expect(deleteContainerMock).toBeCalled();
});
