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
import { isArm, isMac } from './machine-utils';
import fs from 'node:fs';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

// Singular pid file location (can only run 1 VM at a time)
// eslint-disable-next-line sonarjs/publicly-writable-directories
const pidFile = '/tmp/qemu-podman-desktop.pid';

// MacOS related
const macQemuArm64Binary = '/opt/homebrew/bin/qemu-system-aarch64';
const macQemuArm64Edk2 = '/opt/homebrew/share/qemu/edk2-aarch64-code.fd';
const macQemuX86Binary = '/opt/homebrew/bin/qemu-system-x86_64';

// Default values for VM's
const hostForwarding = 'hostfwd=tcp::2222-:22';
const memorySize = '4G';
const websocketPort = '45252';
const rawImageLocation = 'image/disk.raw';

// Abstract base class
export abstract class VMManagerBase {
  protected build: BootcBuildInfo;

  constructor(build: BootcBuildInfo) {
    this.build = build;
  }

  public abstract checkVMLaunchPrereqs(): Promise<string | undefined>;

  protected abstract generateLaunchCommand(diskImage: string): string[];

  public async launchVM(): Promise<void> {
    const diskImage = this.getDiskImagePath();

    if (!fs.existsSync(diskImage)) {
      throw new Error(`Raw disk image not found: ${diskImage}`);
    }

    try {
      const command = this.generateLaunchCommand(diskImage);

      if (command.length === 0) {
        throw new Error(
          'Unable to generate the launch command for the VM, ensure you are on the appropriate OS and architecture.',
        );
      }

      await extensionApi.process.exec('sh', ['-c', `${command.join(' ')}`]);
    } catch (e) {
      handleStdError(e);
    }
  }

  protected getDiskImagePath(): string {
    return path.join(this.build.folder, rawImageLocation);
  }
}

// Mac ARM VM Manager
class MacArmNativeVMManager extends VMManagerBase {
  public async checkVMLaunchPrereqs(): Promise<string | undefined> {
    const diskImage = this.getDiskImagePath();
    if (!fs.existsSync(diskImage)) {
      return `Raw disk image not found at ${diskImage}. Please build a .raw disk image first.`;
    }

    if (this.build.arch !== 'arm64') {
      return `Unsupported architecture: ${this.build.arch}`;
    }

    const installDisclaimer = 'Please install qemu via our installation document';
    if (!fs.existsSync(macQemuArm64Binary)) {
      return `QEMU arm64 binary not found at ${macQemuArm64Binary}. ${installDisclaimer}`;
    }
    if (!fs.existsSync(macQemuArm64Edk2)) {
      return `QEMU arm64 edk2-aarch64-code.fd file not found at ${macQemuArm64Edk2}. ${installDisclaimer}`;
    }
    return undefined;
  }

  protected generateLaunchCommand(diskImage: string): string[] {
    return [
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
      '-snapshot',
      diskImage,
    ];
  }
}

// Mac ARM running x86 images VM Manager
class MacArmX86VMManager extends VMManagerBase {
  public async checkVMLaunchPrereqs(): Promise<string | undefined> {
    const diskImage = this.getDiskImagePath();
    if (!fs.existsSync(diskImage)) {
      return `Raw disk image not found at ${diskImage}. Please build a .raw disk image first.`;
    }

    if (this.build.arch !== 'amd64') {
      return `Unsupported architecture: ${this.build.arch}`;
    }

    const installDisclaimer = 'Please install qemu via our installation document';
    if (!fs.existsSync(macQemuX86Binary)) {
      return `QEMU x86 binary not found at ${macQemuX86Binary}. ${installDisclaimer}`;
    }
    return undefined;
  }

  protected generateLaunchCommand(diskImage: string): string[] {
    return [
      macQemuX86Binary,
      '-m',
      memorySize,
      '-nographic',
      '-cpu',
      'qemu64',
      '-machine',
      'q35',
      '-accel',
      'hvf',
      '-smp',
      '4',
      '-serial',
      `websocket:127.0.0.1:${websocketPort},server,nowait`,
      '-pidfile',
      pidFile,
      '-netdev',
      `user,id=usernet,${hostForwarding}`,
      '-device',
      'e1000,netdev=usernet',
      '-snapshot',
      diskImage,
    ];
  }
}

// Factory function to create the appropriate VM Manager
export function createVMManager(build: BootcBuildInfo): VMManagerBase {
  // Only thing that we support is Mac M1 at the moment
  if (isMac() && isArm()) {
    if (build.arch === 'arm64') {
      return new MacArmNativeVMManager(build);
    } else if (build.arch === 'amd64') {
      return new MacArmX86VMManager(build);
    }
  }
  throw new Error('Unsupported OS or architecture');
}

// Function to stop the current VM
export async function stopCurrentVM(): Promise<void> {
  try {
    await extensionApi.process.exec('sh', ['-c', `kill -9 \`cat ${pidFile}\``]);
  } catch (e) {
    if (e instanceof Error && 'stderr' in e && typeof e.stderr === 'string' && e.stderr.includes('No such process')) {
      return;
    }
    handleStdError(e);
  }
}

// Error handling function
function handleStdError(e: unknown): void {
  if (e instanceof Error && 'stderr' in e) {
    throw new Error(typeof e.stderr === 'string' ? e.stderr : 'Unknown error');
  } else {
    throw new Error('Unknown error');
  }
}
