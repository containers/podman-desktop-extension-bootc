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

import * as extensionApi from '@podman-desktop/api';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

// Async function to get machine information in JSON format
async function getMachineInfo() {
  const { stdout: machineInfoJson } = await extensionApi.process.exec(getPodmanCli(), [
    'machine',
    'info',
    '--format',
    'json',
  ]);
  return JSON.parse(machineInfoJson);
}

// Read the machine configuration and error out if we are uanble to read it.
async function readMachineConfig(machineConfigDir: string, currentMachine: string) {
  const filepath = path.join(machineConfigDir, `${currentMachine}.json`);

  // Check if the file exists before reading it
  if (!fs.existsSync(filepath)) {
    throw new Error(`Machine config file ${filepath} does not exist.`);
  }

  const machineConfigJson = await fs.promises.readFile(filepath, 'utf8');
  return JSON.parse(machineConfigJson);
}

// Check if the current podman machine is rootful
export async function isPodmanMachineRootful() {
  try {
    const machineInfo = await getMachineInfo();
    const machineConfig = await readMachineConfig(machineInfo.Host.MachineConfigDir, machineInfo.Host.CurrentMachine);

    if (machineConfig.Rootful !== undefined) {
      // Make sure we convert to boolean in case the value is "true", not true.
      return Boolean(machineConfig.Rootful);
    } else {
      console.error('No Rootful key found in machine config file, there should be one.');
      return false;
    }
  } catch (error) {
    console.error('Error when checking rootful machine status:', error);
    return false; // Ensure function returns a boolean even in case of error
  }
}

// Below functions are borrowed from the podman extension
function getPodmanCli(): string {
  const customBinaryPath = getCustomBinaryPath();
  if (customBinaryPath) {
    return customBinaryPath;
  }

  if (isWindows()) {
    return 'podman.exe';
  }
  return 'podman';
}

function getCustomBinaryPath(): string | undefined {
  return extensionApi.configuration.getConfiguration('podman').get('binary.path');
}

const windows = os.platform() === 'win32';
export function isWindows(): boolean {
  return windows;
}

const linux = os.platform() === 'linux';
export function isLinux(): boolean {
  return linux;
}
