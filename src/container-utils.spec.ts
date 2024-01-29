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

import { beforeEach, expect, test, vi } from 'vitest';
import * as extensionApi from '@podman-desktop/api';
import {
  getContainerEngine,
  pullImage,
  createAndStartContainer,
  waitForContainerToExit,
  removeContainerIfExists,
  removeContainerAndVolumes,
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

// Write a test that removes a container and a list of volumes that match it
// make sure we mock listVolumes() with a list of volumes that match the engineId
// has Volumes inside and containersUsage matches the container name.
// Then make sure we call deleteVolume() for each volume.
test('removeContainerAndVolumes should remove existing container and volumes associated with it', async () => {
  const listContainersMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).listContainers = listContainersMock;
  listContainersMock.mockResolvedValue([
    { Names: '/1234', Id: '1234', State: 'exited', Status: 'Exited (0)', engineName: 'podman', engineType: 'podman' },
  ]);

  const deleteContainerMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).deleteContainer = deleteContainerMock;

  const listVolumesMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).listVolumes = listVolumesMock;
  listVolumesMock.mockResolvedValue([
    {
      engineId: 'podman',
      Volumes: [
        {
          Name: '1234',
          containersUsage: [
            {
              id: '1234',
              names: ['/1234'],
            },
          ],
        },
        {
          Name: '1234-volumes-2',
          containersUsage: [
            {
              id: '1234',
              names: ['/1234'],
            },
          ],
        },
      ],
    },
  ]);

  const deleteVolumeMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).deleteVolume = deleteVolumeMock;

  await removeContainerAndVolumes('podman', '1234');
  expect(deleteContainerMock).toBeCalled();
  expect(deleteVolumeMock).toBeCalledTimes(2);
});
