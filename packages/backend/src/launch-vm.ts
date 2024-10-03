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

import path from 'node:path';
import * as extensionApi from '@podman-desktop/api';
import { isMac } from './machine-utils';
import fs from 'node:fs';

// Ignore the following line as this is where we will be storing the pid file
// similar to other projects that use pid files in /tmp
// eslint-disable-next-line sonarjs/publicly-writable-directories
const pidFile = '/tmp/qemu-podman-desktop.pid';

// Must use "homebrew" qemu binaries on macOS
// as they are found to be the most stable and reliable for the project
// as well as containing the necessary "edk2-aarch64-code.fd" file
// it is not advised to use the qemu binaries from qemu.org due to edk2-aarch64-code.fd not being included.
const macQemuArm64Binary = '/opt/homebrew/bin/qemu-system-aarch64';
const macQemuArm64Edk2 = '/opt/homebrew/share/qemu/edk2-aarch64-code.fd';
const macQemuX86Binary = '/opt/homebrew/bin/qemu-system-x86_64';

// Host port forwarding for VM we will by default port forward 22 on the bootable container
// to :2222 on the host
const hostForwarding = 'hostfwd=tcp::2222-:22';

// Default memory size for the VM and websocket port location
const memorySize = '4G';
const websocketPort = '45252';

// Raw image location
const rawImageLocation = 'image/disk.raw';

export async function launchVM(folder: string, architecture: string): Promise<void> {
  // Will ONLY work with RAW images located at image/disk.raw which is the default output location
  const diskImage = path.join(folder, rawImageLocation);

  // Check to see that the disk image exists before continuing
  if (!fs.existsSync(diskImage)) {
    throw new Error(`Raw disk image not found: ${diskImage}`);
  }

  // Generate the launch command and then run process.exec
  try {
    const command = generateLaunchCommand(diskImage, architecture);

    // If generateLaunchCommand returns an empty array, then we are not able to launch the VM
    // so simply error out and return
    if (command.length === 0) {
      throw new Error(
        'Unable to generate the launch command for the VM, must be on the appropriate OS (mac or linux) and architecture (x86_64 or aarch64)',
      );
    }

    // Execute the command
    await extensionApi.process.exec('sh', ['-c', `${command.join(' ')}`]);
  } catch (e) {
    // Output the stderr information if it exists as that helps with debugging
    // why the command could not run.
    if (e instanceof Error && 'stderr' in e) {
      console.error('Error launching VM: ', e.stderr);
    } else {
      console.error('Error launching VM: ', e);
    }
    throw e;
  }
}

// Stop VM by killing the process with the pid file (/tmp/qemu-podman-desktop.pid)
export async function stopVM(): Promise<void> {
  try {
    await extensionApi.process.exec('sh', ['-c', `kill -9 \`cat ${pidFile}\``]);
  } catch (e) {
    // If it errors out, we will ignore the error if it has stderr, is a string
    // and contains 'No such process' as that means the process is not running
    if (e instanceof Error && 'stderr' in e && typeof e.stderr === 'string' && e.stderr.includes('No such process')) {
      return;
    }

    // if 'stderr' exists, we will throw an error with the stderr information
    if (e instanceof Error && 'stderr' in e) {
      throw new Error(typeof e.stderr === 'string' ? e.stderr : 'Unknown error');
    } else {
      throw new Error('Unknown error');
    }
  }
}

// Prereqs checks before launching the VM
export async function checkVMLaunchPrereqs(folder: string, architecture: string): Promise<string | undefined> {
  // Check to see that the disk image exists before continuing
  const diskImage = path.join(folder, rawImageLocation);
  if (!fs.existsSync(diskImage)) {
    return `Raw disk image not found at ${diskImage}. Please build a .raw disk image first.`;
  }

  // Check to see if the architecture is supported
  if (architecture !== 'amd64' && architecture !== 'arm64') {
    return `Unsupported architecture: ${architecture}`;
  }

  // If on macOS, check the qemu binaries exist as well as the edk2-aarch64-code.fd file
  if (isMac()) {
    const installDisclaimer = 'Please install qemu via our installation document';
    if (!fs.existsSync(macQemuX86Binary)) {
      return `QEMU x86 binary not found at ${macQemuX86Binary}. ${installDisclaimer}`;
    }
    if (architecture === 'arm64' && !fs.existsSync(macQemuArm64Binary)) {
      return `QEMU arm64 binary not found at ${macQemuArm64Binary}. ${installDisclaimer}`;
    }
    if (architecture === 'arm64' && !fs.existsSync(macQemuArm64Edk2)) {
      return `QEMU arm64 edk2-aarch64-code.fd file not found at ${macQemuArm64Edk2}. ${installDisclaimer}`;
    }
  }

  return undefined;
}

// Generate launch command for qemu
// this all depends on what architecture we are launching as well as
// operating system
function generateLaunchCommand(diskImage: string, architecture: string): string[] {
  let command: string[] = [];
  switch (architecture) {
    // Case for anything amd64
    case 'amd64':
      if (isMac()) {
        command = [
          macQemuX86Binary,
          '-m',
          memorySize,
          '-nographic',
          '-cpu',
          'Broadwell-v4',
          '-pidfile',
          pidFile,
          '-serial',
          `websocket:127.0.0.1:${websocketPort},server,nowait`,
          '-netdev',
          `user,id=mynet0,${hostForwarding}`,
          '-device',
          'e1000,netdev=mynet0',
          // Make sure we always have snapshot here as we don't want to modify the original image
          '-snapshot',
          diskImage,
        ];
      }
      break;

    // For any arm64 images
    case 'arm64':
      if (isMac()) {
        command = [
          macQemuArm64Binary,
          '-m',
          memorySize,
          '-nographic',
          '-M',
          'virt',
          '-accel',
          'hvf',
          '-cpu',
          'host',
          '-smp',
          '4',
          '-serial',
          `websocket:127.0.0.1:${websocketPort},server,nowait`,
          '-pidfile',
          pidFile,
          '-netdev',
          `user,id=usernet,${hostForwarding}`,
          '-device',
          'virtio-net,netdev=usernet',
          '-drive',
          `file=${macQemuArm64Edk2},format=raw,if=pflash,readonly=on`,
          // Make sure we always have snapshot here as we don't want to modify the original image
          '-snapshot',
          diskImage,
        ];
      }
      break;
    default:
      break;
  }
  return command;
}
