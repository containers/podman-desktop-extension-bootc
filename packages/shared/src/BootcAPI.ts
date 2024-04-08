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

import type { BootcBuildInfo, BuildType } from './models/bootc';
import type { ImageInfo } from '@podman-desktop/api';

export abstract class BootcApi {
  abstract checkPrereqs(): Promise<string | undefined>;
  abstract buildExists(folder: string, types: BuildType[]): Promise<boolean>;
  abstract buildImage(build: BootcBuildInfo, overwrite?: boolean): Promise<void>;
  abstract pullImage(image: string): Promise<void>;
  abstract deleteBuilds(builds: BootcBuildInfo[]): Promise<void>;
  abstract selectOutputFolder(): Promise<string>;
  abstract listBootcImages(): Promise<ImageInfo[]>;
  abstract listHistoryInfo(): Promise<BootcBuildInfo[]>;
  abstract openFolder(folder: string): Promise<boolean>;
  abstract generateUniqueBuildID(name: string): Promise<string>;
  abstract openLink(link: string): Promise<void>;
  abstract telemetryLogUsage(eventName: string, data?: Record<string, unknown> | undefined): Promise<void>;
  abstract telemetryLogError(eventName: string, data?: Record<string, unknown> | undefined): Promise<void>;
}
