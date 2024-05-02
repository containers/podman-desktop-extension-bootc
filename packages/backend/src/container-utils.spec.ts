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
  deleteOldImages,
  inspectImage,
  inspectManifest,
  getImageBuilderLabel,
} from './container-utils';

const mocks = vi.hoisted(() => ({
  logUsageMock: vi.fn(),
}));

// Mocks and utilities
vi.mock('@podman-desktop/api', async () => {
  return {
    containerEngine: {
      pullImage: vi.fn(),
      createContainer: vi.fn(),
      listContainers: vi.fn(),
      deleteContainer: vi.fn(),
      inspectManifest: vi.fn(),
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

vi.mock('./extension', async () => {
  return {
    getConfigurationValue: vi.fn(),
    telemetryLogger: {
      logUsage: mocks.logUsageMock,
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
  expect(mocks.logUsageMock).toHaveBeenCalled();
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

test('test waitForContainerToExit should throw error if container does not exit', async () => {
  const listContainersMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).listContainers = listContainersMock;
  listContainersMock.mockResolvedValue([]);

  // Exit with a quick timeout of 1 retry
  await expect(waitForContainerToExit('1234', 1)).rejects.toThrow('Container not found after maximum retries');
});

test('Check that listContainers was called 2 times with a retry count of 2 if container was not found', async () => {
  const listContainersMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).listContainers = listContainersMock;
  listContainersMock.mockResolvedValue([]);

  // Exit with a quick timeout of 2 retries
  await expect(waitForContainerToExit('1234', 2)).rejects.toThrow('Container not found after maximum retries');
  expect(listContainersMock).toBeCalledTimes(2);
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

// Test deleteOldImages() deletes correctly tagged images
test('deleteOldImages should remove images with other tags', async () => {
  const listImagesMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).listImages = listImagesMock;
  listImagesMock.mockResolvedValue([
    { engineId: 'podman', Id: 'i1', RepoTags: ['test.io/name:1'] },
    { engineId: 'podman', Id: 'i2', RepoTags: ['test.io/name:2'] },
    { engineId: 'podman', Id: 'i3', RepoTags: ['test.io/name:3'] },
    { engineId: 'podman', Id: 'i4', RepoTags: ['test.io/name:4', 'keep-me'] },
  ]);

  const deletedIds: string[] = [];
  const deleteImageMock = vi.fn().mockImplementation((_engineId, id) => deletedIds.push(id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).deleteImage = deleteImageMock;

  await deleteOldImages('podman', 'test.io/name:2');
  expect(deleteImageMock).toHaveBeenCalledTimes(2);
  expect(deletedIds).toEqual(['i1', 'i3']);
});

test('test running inspectImage', async () => {
  const image = { engineId: 'podman', Id: 'i1' };
  const inspectImageMock = vi.fn().mockResolvedValue({ Id: 'i1' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).getImageInspect = inspectImageMock;

  // Test that it'll call getImageInspect (returns i1)
  const result = await inspectImage(image.engineId, image.Id);
  expect(result.Id).toBe('i1');
});

test('test running inspectManifest', async () => {
  const image = { engineId: 'podman', Id: 'i1' };
  const inspectManifestMock = vi.fn().mockResolvedValue({
    engineId: 'podman1',
    engineName: 'podman',
    manifests: [
      {
        digest: 'digest',
        mediaType: 'mediaType',
        platform: {
          architecture: 'architecture',
          features: [],
          os: 'os',
          osFeatures: [],
          osVersion: 'osVersion',
          variant: 'variant',
        },
        size: 100,
        urls: ['url1', 'url2'],
      },
    ],
    mediaType: 'mediaType',
    schemaVersion: 1,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).inspectManifest = inspectManifestMock;

  // Test that it'll call getManifestInspect (returns i1)
  const result = await inspectManifest(image.engineId, image.Id);

  // Check the results are as expected
  expect(result).toBeDefined();
  expect(result.engineId).toBe('podman1');
  expect(result.engineName).toBe('podman');
  expect(result.manifests).toBeDefined();
});

test('test image builder label', async () => {
  const listImagesMock = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (extensionApi.containerEngine as any).listImages = listImagesMock;
  listImagesMock.mockResolvedValue([
    { RepoTags: ['test.io/name:1'] },
    { RepoTags: ['test.io/name:2'], Labels: { 'bootc.diskimage-builder': 'foo' } },
    { RepoTags: ['test.io/name:3'] },
    { RepoTags: ['test.io/name:4', 'keep-me'] },
  ]);

  // Test that it'll find the right image and label
  const result = await getImageBuilderLabel('test.io/name:2');
  expect(result).toBe('foo');
});
