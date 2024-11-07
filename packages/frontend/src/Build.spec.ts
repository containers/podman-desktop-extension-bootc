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

import { vi, test, expect } from 'vitest';
import { screen, render, waitFor } from '@testing-library/svelte';
import Build from './Build.svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import type { ImageInfo, ImageInspectInfo, ManifestInspectInfo } from '@podman-desktop/api';
import { bootcClient } from './api/client';
import { router } from 'tinro';
import userEvent from '@testing-library/user-event';
import { historyInfo } from './stores/historyInfo';

const mockHistoryInfo: BootcBuildInfo[] = [
  {
    id: 'name1',
    imageId: 'sha256:image1',
    image: 'image1',
    engineId: 'engine1',
    tag: 'latest',
    type: ['raw'],
    folder: '/foo/image1',
    arch: 'x86_64',
  },
  {
    id: 'name2',
    image: 'image2',
    imageId: 'sha256:image',
    engineId: 'engine2',
    tag: 'latest',
    type: ['qcow2'],
    folder: '/foo/image1',
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
    Digest: 'sha256:image1',
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
    Digest: 'sha256:image2',
  },
];

const mockImageInspect = {
  Architecture: 'amd64',
} as unknown as ImageInspectInfo;

const mockIsLinux = false;
const mockIsMac = false;

vi.mock('./api/client', async () => {
  return {
    bootcClient: {
      checkPrereqs: vi.fn(),
      buildExists: vi.fn(),
      listHistoryInfo: vi.fn(),
      listBootcImages: vi.fn(),
      listAllImages: vi.fn(),
      inspectImage: vi.fn(),
      inspectManifest: vi.fn(),
      isLinux: vi.fn().mockImplementation(() => mockIsLinux),
      generateUniqueBuildID: vi.fn(),
      buildImage: vi.fn(),
      isMac: vi.fn().mockImplementation(() => mockIsMac),
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

// mock the router
vi.mock('tinro', () => {
  return {
    router: {
      goto: vi.fn(),
    },
  };
});

test('Render shows correct images and history', async () => {
  vi.mocked(bootcClient.inspectImage).mockResolvedValue(mockImageInspect);
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);

  // need to subscrible once to prime the store
  const unsub = historyInfo.subscribe(_v => {});
  unsub();

  render(Build);

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  await vi.waitFor(() => {
    if (screen.getByLabelText('image-select')?.children.length !== 2) {
      throw new Error();
    }
  });

  const select = screen.getByLabelText('image-select');
  expect(select).toBeDefined();
  expect(select.children.length).toEqual(2);

  // Expect image:1 to be first since it's the last one in the history
  expect(select.children[0].textContent).toEqual('image1:latest');
  expect(select.children[1].textContent).toEqual('image2:latest');

  // Expect input iso to be selected
  const raw = screen.getByLabelText('raw-checkbox');
  expect(raw).toBeDefined();
  expect(raw).toBeChecked();

  // Expect input amd64 to be selected
  const x86_64 = screen.getByLabelText('amd64-select');
  expect(x86_64).toBeDefined();
  expect(x86_64).toBeChecked();

  // Expect input /tmp/image1 to be selected
  const folder = screen.getByLabelText('folder-select');
  expect(folder).toBeDefined();

  //  expect(folder.value).toBe('/tmp/image1');
  // but use isIsnstanceIf for checking
  expect(folder).toBeInstanceOf(HTMLInputElement);
});

test('Check that VMDK option is there', async () => {
  render(Build);

  const vmdk = screen.getByLabelText('vmdk-checkbox');
  expect(vmdk).toBeDefined();
});

test('Check that preselecting an image works', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  render(Build, { imageName: 'image2', imageTag: 'latest' });

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  await vi.waitFor(() => {
    if (screen.getByLabelText('image-select')?.children.length !== 2) {
      throw new Error();
    }
  });

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

  render(Build);

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  await vi.waitFor(() => {
    if (screen.getByLabelText('image-select')?.children.length !== 2) {
      throw new Error();
    }
  });

  // select an option to trigger validation
  const raw = screen.getByLabelText('raw-checkbox');
  raw.click();

  const validation = screen.getByRole('alert');
  expect(validation).toBeDefined();
  expect(validation.textContent).toEqual(prereq);
});

test('Check that overwriting an existing build works', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(true);

  // Mock the inspectImage to return 'amd64' as the architecture so it's selected / we can test the override function
  vi.mocked(bootcClient.inspectImage).mockResolvedValue(mockImageInspect);

  render(Build, { imageName: 'image2', imageTag: 'latest' });

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  await vi.waitFor(() => {
    if (screen.getByLabelText('image-select')?.children.length !== 2) {
      throw new Error();
    }
  });

  const overwrite = screen.getByLabelText('Overwrite existing build');
  expect(overwrite).toBeDefined();
  const overwrite2 = screen.getByLabelText('overwrite-checkbox');
  expect(overwrite2).toBeDefined();

  const validation = screen.getByRole('alert');
  expect(validation).toBeDefined();
  expect(validation.textContent).toEqual('Confirm overwriting existing build');

  // select the checkbox and give it time to validate
  await userEvent.click(overwrite2);

  const validation2 = screen.queryByRole('alert');
  expect(validation2).toBeNull();
});

const fakedImageInspect: ImageInspectInfo = {
  Architecture: 'amd64',
  Author: '',
  Comment: '',
  Config: {
    ArgsEscaped: false,
    AttachStderr: false,
    AttachStdin: false,
    AttachStdout: false,
    Cmd: [],
    Domainname: '',
    Entrypoint: [],
    Env: [],
    ExposedPorts: {},
    Hostname: '',
    Image: '',
    Labels: {},
    OnBuild: [],
    OpenStdin: false,
    StdinOnce: false,
    Tty: false,
    User: '',
    Volumes: {},
    WorkingDir: '',
  },
  Container: '',
  ContainerConfig: {
    ArgsEscaped: false,
    AttachStderr: false,
    AttachStdin: false,
    AttachStdout: false,
    Cmd: [],
    Domainname: '',
    Env: [],
    ExposedPorts: {},
    Hostname: '',
    Image: '',
    Labels: {},
    OpenStdin: false,
    StdinOnce: false,
    Tty: false,
    User: '',
    Volumes: {},
    WorkingDir: '',
  },
  Created: '',
  DockerVersion: '',
  GraphDriver: { Data: { DeviceId: '', DeviceName: '', DeviceSize: '' }, Name: '' },
  Id: '',
  Os: '',
  Parent: '',
  RepoDigests: [],
  RepoTags: [],
  RootFS: {
    Type: '',
  },
  Size: 0,
  VirtualSize: 0,
  engineId: 'engineid',
  engineName: 'engineName',
};

test('Test that arm64 is disabled in form if inspectImage returns no arm64', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.inspectImage).mockResolvedValue(fakedImageInspect);

  render(Build, { imageName: 'image2', imageTag: 'latest' });

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  while (screen.getByLabelText('image-select')?.children.length !== 2) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const arm64 = screen.getByLabelText('arm64-select');
  expect(arm64).toBeDefined();
  expect(arm64).toBeDisabled();

  // Expect input amd64 to be selected
  const x86_64 = screen.getByLabelText('amd64-select');
  expect(x86_64).toBeDefined();
  expect(x86_64).toBeChecked();
});

test('In the rare case that Architecture from inspectImage is blank, do not select either', async () => {
  const fakeImageNoArchitecture = fakedImageInspect;
  fakeImageNoArchitecture.Architecture = '';

  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.inspectImage).mockResolvedValue(fakeImageNoArchitecture);

  render(Build, { imageName: 'image2', imageTag: 'latest' });

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  await vi.waitFor(() => {
    if (screen.getByLabelText('image-select')?.children.length !== 2) {
      throw new Error();
    }
  });

  const arm64 = screen.getByLabelText('arm64-select');
  expect(arm64).toBeDefined();
  expect(arm64).toBeDisabled();

  const x86_64 = screen.getByLabelText('amd64-select');
  expect(x86_64).toBeDefined();
  expect(x86_64).toBeDisabled();
});

test('Do not show an image if it has no repotags and has isManifest as false', async () => {
  const mockedImages: ImageInfo[] = [
    {
      Id: 'image1',
      RepoTags: [],
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
      Digest: 'sha256:image1',
      isManifest: false,
    },
  ];

  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockedImages);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  render(Build);

  // Wait until children length is 1
  await vi.waitFor(() => {
    if (screen.getByLabelText('image-select')?.children.length !== 1) {
      throw new Error();
    }
  });

  const select = screen.getByLabelText('image-select');
  expect(select).toBeDefined();
  expect(select.children.length).toEqual(1);
  expect(select.children[0].textContent).toEqual('Select an image');

  // Find the <p> that CONTAINS "No bootable container compatible images found."
  const noImages = screen.getByText(/No bootable container compatible images found./);
  expect(noImages).toBeDefined();
});

test('If inspectImage fails, do not select any architecture / make them available', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.inspectImage).mockRejectedValue('Error');

  render(Build, { imageName: 'image2', imageTag: 'latest' });

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  await vi.waitFor(() => {
    if (screen.getByLabelText('image-select')?.children.length !== 2) {
      throw new Error();
    }
  });

  const arm64 = screen.getByLabelText('arm64-select');
  expect(arm64).toBeDefined();
  expect(arm64).toBeDisabled();

  const x86_64 = screen.getByLabelText('amd64-select');
  expect(x86_64).toBeDefined();
  expect(x86_64).toBeDisabled();

  // Expect Architecture must be selected to be shown
  const validation = screen.getByRole('alert');
  expect(validation).toBeDefined();
  expect(validation.textContent).toEqual('Architecture must be selected');
});

test('Show the image if isManifest: true and Labels is empty', async () => {
  // spy on inspectManifest
  const spyOnInspectManifest = vi.spyOn(bootcClient, 'inspectManifest');

  const mockedImages: ImageInfo[] = [
    {
      Id: 'testmanifest1',
      RepoTags: ['testmanifest1:latest'],
      Labels: {},
      engineId: 'engine1',
      engineName: 'engine1',
      ParentId: 'parent1',
      Created: 0,
      VirtualSize: 0,
      Size: 0,
      Containers: 0,
      SharedSize: 0,
      Digest: 'sha256:image1',
      isManifest: true,
    },
    // "children" images of a manifest that has the 'bootc' and 'containers.bootc' labels
    // they have no repo tags, but have the labels / architecture
    {
      Id: 'image2',
      RepoTags: [],
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
      Digest: 'sha256:image2',
      isManifest: false,
    },
  ];

  const mockedManifestInspect: ManifestInspectInfo = {
    engineId: 'podman1',
    engineName: 'podman',
    manifests: [
      {
        digest: 'sha256:image2',
        mediaType: 'mediaType',
        platform: {
          architecture: 'amd64',
          features: [],
          os: 'os',
          variant: 'variant',
        },
        size: 100,
        urls: ['url1', 'url2'],
      },
    ],
    mediaType: 'mediaType',
    schemaVersion: 1,
  };

  vi.mocked(bootcClient.inspectManifest).mockResolvedValue(mockedManifestInspect);
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockedImages);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  render(Build, { imageName: 'testmanifest1', imageTag: 'latest' });

  waitFor(() => {
    expect(spyOnInspectManifest).toHaveBeenCalled();
  });

  // Wait to render
  await new Promise(resolve => setTimeout(resolve, 200));

  const select = screen.getByLabelText('image-select');
  expect(select).toBeDefined();
  expect(select.children.length).toEqual(1);
  expect(select.children[0].textContent).toEqual('testmanifest1:latest');

  // Expect input amd64 to be selected
  const x86_64 = screen.getByLabelText('amd64-select');
  expect(x86_64).toBeDefined();
  expect(x86_64).toBeChecked();

  // arm64 should be disabled
  const arm64 = screen.getByLabelText('arm64-select');
  expect(arm64).toBeDefined();
  expect(arm64).toBeDisabled();
});

test('have amd64 and arm64 NOT disabled if inspectManifest contains both architectures / child images', async () => {
  // spy on inspectManifest
  const spyOnInspectManifest = vi.spyOn(bootcClient, 'inspectManifest');

  const mockedImages: ImageInfo[] = [
    {
      Id: 'testmanifest1',
      RepoTags: ['testmanifest1:latest'],
      Labels: {},
      engineId: 'engine1',
      engineName: 'engine1',
      ParentId: 'parent1',
      Created: 0,
      VirtualSize: 0,
      Size: 0,
      Containers: 0,
      SharedSize: 0,
      Digest: 'sha256:image1',
      isManifest: true,
    },
    // "children" images of a manifest that has the 'bootc' and 'containers.bootc' labels
    // they have no repo tags, but have the labels / architecture
    {
      Id: 'image2',
      RepoTags: [],
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
      Digest: 'sha256:image2',
      isManifest: false,
    },
    {
      Id: 'image3',
      RepoTags: [],
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
      Digest: 'sha256:image3',
      isManifest: false,
    },
  ];

  const mockedManifestInspect: ManifestInspectInfo = {
    engineId: 'podman1',
    engineName: 'podman',
    manifests: [
      {
        digest: 'sha256:image2',
        mediaType: 'mediaType',
        platform: {
          architecture: 'amd64',
          features: [],
          os: 'os',
          variant: 'variant',
        },
        size: 100,
        urls: ['url1', 'url2'],
      },
      {
        digest: 'sha256:image3',
        mediaType: 'mediaType',
        platform: {
          architecture: 'arm64',
          features: [],
          os: 'os',
          variant: 'variant',
        },
        size: 100,
        urls: ['url1', 'url2'],
      },
    ],
    mediaType: 'mediaType',
    schemaVersion: 1,
  };

  vi.mocked(bootcClient.inspectManifest).mockResolvedValue(mockedManifestInspect);
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockedImages);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  render(Build, { imageName: 'testmanifest1', imageTag: 'latest' });

  waitFor(() => {
    expect(spyOnInspectManifest).toHaveBeenCalled();
  });

  // Wait to render
  await new Promise(resolve => setTimeout(resolve, 200));

  const select = screen.getByLabelText('image-select');
  expect(select).toBeDefined();
  expect(select.children.length).toEqual(1);
  expect(select.children[0].textContent).toEqual('testmanifest1:latest');

  // Expect amd64 and arm64 to be not disabled
  const x86_64 = screen.getByLabelText('amd64-select');
  expect(x86_64).toBeDefined();
  expect(x86_64).not.toBeDisabled();

  const arm64 = screen.getByLabelText('arm64-select');
  expect(arm64).toBeDefined();
  expect(x86_64).not.toBeDisabled();
});

test('if a manifest is created that has the label "6.8.9-300.fc40.aarch64" in associated digest images, xfs should be selected by default', async () => {
  // Mock manifest and image data with Fedora label
  const mockManifestInspect = {
    engineId: 'podman1',
    engineName: 'podman',
    manifests: [
      {
        digest: 'sha256:fedoraImage',
        mediaType: 'mediaType',
        platform: {
          architecture: 'aarch64',
          features: [],
          os: 'os',
          variant: 'variant',
        },
        size: 100,
        urls: ['url1', 'url2'],
      },
    ],
    mediaType: 'mediaType',
    schemaVersion: 1,
  };

  const mockFedoraImage = {
    Id: 'fedoraImage',
    RepoTags: ['fedoraImage:latest'],
    Labels: {
      'ostree.linux': '6.8.9-300.fc40.aarch64',
    },
    engineId: 'podman1',
    engineName: 'podman',
    ParentId: '',
    Created: 0,
    VirtualSize: 0,
    Size: 0,
    Containers: 0,
    SharedSize: 0,
    Digest: 'sha256:fedoraImage',
  };

  vi.mocked(bootcClient.inspectManifest).mockResolvedValue(mockManifestInspect);
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue([mockFedoraImage]);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);

  render(Build, { imageName: 'fedoraImage', imageTag: 'latest' });

  await new Promise(resolve => setTimeout(resolve, 200));

  const xfsRadio = screen.getByLabelText('xfs-filesystem-select');
  expect(xfsRadio).toBeDefined();
  // expect it to be selected
  expect(xfsRadio).toBeChecked();
});

test('collapse and uncollapse of advanced options', async () => {
  render(Build);

  const advancedOptions = screen.getByLabelText('advanced-options');
  expect(advancedOptions).toBeDefined();

  // expect the input labels to be hidden on load
  const amiName = screen.queryByRole('label', { name: 'AMI Name' });
  expect(amiName).toBeNull();
  const amiBucket = screen.queryByRole('label', { name: 'S3 Bucket' });
  expect(amiBucket).toBeNull();
  const amiRegion = screen.queryByRole('label', { name: 'S3 Region' });
  expect(amiRegion).toBeNull();

  // Expect Build Config to be hidden
  const buildConfig = screen.queryByRole('label', { name: 'Build config' });
  expect(buildConfig).toBeNull();

  // Click on the Advanced Options span
  advancedOptions.click();

  // expect the label "AMI Name" to be shown
  const amiName2 = screen.queryByRole('label', { name: 'AMI Name' });
  expect(amiName2).toBeDefined();
  // expect the label "S3 Bucket" to be shown
  const amiBucket2 = screen.queryByRole('label', { name: 'S3 Bucket' });
  expect(amiBucket2).toBeDefined();
  // expect the label "S3 Region" to be shown
  const amiRegion2 = screen.queryByRole('label', { name: 'S3 Region' });
  expect(amiRegion2).toBeDefined();
  // expect build config to be shown
  const buildConfig2 = screen.queryByRole('label', { name: 'Build config' });
  expect(buildConfig2).toBeDefined();
  // Expect chown to be shown
  const chown = screen.queryByRole('label', { name: 'Change file owner and group' });
  expect(chown).toBeDefined();
});

test('select anaconda-iso and qcow2 and expect validation error to be shown', async () => {
  vi.mocked(bootcClient.inspectImage).mockResolvedValue(mockImageInspect);
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(false);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  render(Build);

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  await vi.waitFor(() => {
    if (screen.getByLabelText('image-select')?.children.length !== 2) {
      throw new Error();
    }
  });

  // Unclick raw checkbox as it's the default from history
  const raw = screen.getByLabelText('raw-checkbox');
  raw.click();

  // Get checkbox 'iso-checkbox' and click it.
  const iso = screen.getByLabelText('iso-checkbox');
  await userEvent.click(iso);

  // Expect 'alert' to not be there
  expect(screen.queryByRole('alert')).toBeNull();

  // Get checkbox 'qcow2-checkbox' and click it.
  const qcow2 = screen.getByLabelText('qcow2-checkbox');
  await userEvent.click(qcow2);

  // Expect alert to be shown
  const validation = screen.getByRole('alert');
  expect(validation).toBeDefined();
  expect(validation.textContent).toEqual(
    'The Anaconda ISO file format cannot be built simultaneously with other image types.',
  );
});

test('confirm successful build goes to logs', async () => {
  vi.mocked(bootcClient.listHistoryInfo).mockResolvedValue(mockHistoryInfo);
  vi.mocked(bootcClient.listBootcImages).mockResolvedValue(mockBootcImages);
  vi.mocked(bootcClient.checkPrereqs).mockResolvedValue(undefined);
  vi.mocked(bootcClient.buildExists).mockResolvedValue(true);
  vi.mocked(bootcClient.inspectImage).mockResolvedValue(mockImageInspect);

  // mock unique id so that it matches an image in the history ('new' build exists already)
  vi.mocked(bootcClient.generateUniqueBuildID).mockReturnValue(Promise.resolve(mockHistoryInfo[0].id));

  render(Build);

  // Wait until children length is 2 meaning it's fully rendered / propagated the changes
  await vi.waitFor(() => {
    if (screen.getByLabelText('image-select')?.children.length !== 2) {
      throw new Error();
    }
  });

  // confirm overwriting the previous build
  const overwriteCheck = screen.getByLabelText('overwrite-checkbox');
  expect(overwriteCheck).toBeDefined();
  await userEvent.click(overwriteCheck);

  // confirm build button is enabled
  const build = screen.getByText('Build');
  expect(build).toBeInTheDocument();
  expect(build).toBeEnabled();

  // check that clicking redirects to the build logs page
  expect(router.goto).not.toHaveBeenCalled();
  await userEvent.click(build);
  expect(router.goto).toHaveBeenCalledWith(`/disk-image/bmFtZTE=/build`);
});
