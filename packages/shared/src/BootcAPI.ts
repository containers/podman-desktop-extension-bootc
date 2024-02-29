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
 l***********************************************************************/

import type { BootcBuildOptions, BootcHistoryInfo } from './models/bootc';
import type { ImageInfo } from '@podman-desktop/api';

export abstract class BootcApi {
  abstract ping(): Promise<string>;
  abstract selectOutputFolder(): Promise<string>;
  abstract buildImage(build: BootcBuildOptions): Promise<void>;
  abstract listBootcImages(): Promise<ImageInfo[]>;
  abstract listHistoryInfo(): Promise<BootcHistoryInfo[]>;
  abstract recoverLostBuilds(): Promise<void>;
  abstract deleteBuild(image: string, tag: string, type: string, arch: string, containerId: string): Promise<void>;
  abstract navigateToContainerLogs(imageId: string): Promise<void>;
  abstract deleteAll(): Promise<void>;
  abstract getBuildLog(folder: string): Promise<string>;
}
