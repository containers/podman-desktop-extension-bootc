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

export type BuildType = 'qcow2' | 'ami' | 'raw' | 'vmdk' | 'anaconda-iso' | 'vhd';

// Follows https://github.com/osbuild/bootc-image-builder?tab=readme-ov-file#-build-config convention
// users = array
// filesystems = array
// kernel = mapping
export interface BuildConfig {
  user?: BuildConfigUser[];
  filesystem?: BuildConfigFilesystem[];
  kernel?: BuildConfigKernel;
  // In the future:
  // * Add installer.kickstart https://github.com/osbuild/bootc-image-builder?tab=readme-ov-file#anaconda-iso-installer-options-installer-mapping
  // * Add anaconda iso modules https://github.com/osbuild/bootc-image-builder?tab=readme-ov-file#anaconda-iso-installer-modules
}

export interface BuildConfigUser {
  name: string;
  password?: string;
  key?: string;
  groups?: string[];
}

export interface BuildConfigFilesystem {
  mountpoint: string;
  minsize: string;
}

export interface BuildConfigKernel {
  append: string;
}

export interface BootcBuildInfo {
  id: string;
  image: string;
  imageId: string;
  tag: string;
  engineId: string;
  type: BuildType[];
  folder: string;
  chown?: string;
  buildConfig?: BuildConfig;
  buildConfigFilePath?: string;
  filesystem?: string;
  arch?: string;
  status?: BootcBuildStatus;
  timestamp?: string;
  buildContainerId?: string; // The image ID that is used to build the image
  awsAmiName?: string;
  awsBucket?: string;
  awsRegion?: string;
}

export type BootcBuildStatus = 'running' | 'creating' | 'success' | 'error' | 'lost' | 'deleting';
