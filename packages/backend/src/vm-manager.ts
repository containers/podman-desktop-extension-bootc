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

export default class VMManager {
  private folder: string;
  private architecture: string;

  // Only values needed is the location of the VM file as well as the architecture of the image that
  // will be used.
  constructor(folder?: string, architecture?: string) {
    this.folder = folder!;
    this.architecture = architecture!;
  }

  // Launch the VM by generating the appropriate QEMU command and then launching it with process.exec
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
      this.handleError(e);
    }
  }

  // We only support running one VM at at a time, so we kill the process by reading the pid from the universal pid file we use.
  public async stopCurrentVM(): Promise<void> {
    try {
      await extensionApi.process.exec('sh', ['-c', `kill -9 \`cat ${pidFile}\``]);
    } catch (e) {
      // Ignore if it contains 'No such process' as that means the VM is already stopped / not running.
      if (e instanceof Error && 'stderr' in e && typeof e.stderr === 'string' && e.stderr.includes('No such process')) {
        return;
      }
      this.handleError(e);
    }
  }

  // Prerequisite checks before launching the VM which includes checking if QEMU is installed as well as other OS specific checks.
  public async checkVMLaunchPrereqs(): Promise<string | undefined> {
    const diskImage = this.getDiskImagePath();
    if (!fs.existsSync(diskImage)) {
      return `Raw disk image not found at ${diskImage}. Please build a .raw disk image first.`;
    }

    if (!this.isArchitectureSupported()) {
      return `Unsupported architecture: ${this.architecture}`;
    }

    // Future support for Mac Intel, Linux ARM, Linux X86 and Windows ARM, Windows X86 to be added here.
    if (isMac() && isArm()) {
      return this.checkMacPrereqs();
    } else {
      return 'Unsupported OS. Only MacOS Silicon is supported.';
    }
  }

  private getDiskImagePath(): string {
    return path.join(this.folder, rawImageLocation);
  }

  private isArchitectureSupported(): boolean {
    return this.architecture === 'amd64' || this.architecture === 'arm64';
  }

  private checkMacPrereqs(): string | undefined {
    const installDisclaimer = 'Please install qemu via our installation document';
    if (!fs.existsSync(macQemuX86Binary)) {
      return `QEMU x86 binary not found at ${macQemuX86Binary}. ${installDisclaimer}`;
    }
    if (this.architecture === 'arm64' && !fs.existsSync(macQemuArm64Binary)) {
      return `QEMU arm64 binary not found at ${macQemuArm64Binary}. ${installDisclaimer}`;
    }
    if (this.architecture === 'arm64' && !fs.existsSync(macQemuArm64Edk2)) {
      return `QEMU arm64 edk2-aarch64-code.fd file not found at ${macQemuArm64Edk2}. ${installDisclaimer}`;
    }
    return undefined;
  }

  // Supported: MacOS Silicon
  // Unsupported: MacOS Intel, Linux, Windows
  private generateLaunchCommand(diskImage: string): string[] {
    // Future support for Mac Intel, Linux ARM, Linux X86 and Windows ARM, Windows X86 to be added here.
    if (isMac() && isArm()) {
      switch (this.architecture) {
        case 'amd64':
          return this.generateMacX86Command(diskImage);
        case 'arm64':
          return this.generateMacArm64Command(diskImage);
      }
    }
    return [];
  }

  private generateMacX86Command(diskImage: string): string[] {
    return [
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
      '-snapshot',
      diskImage,
    ];
  }

  private generateMacArm64Command(diskImage: string): string[] {
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

  // When running process.exec we should TRY and get stderr which it outputs (sometimes) so we do not get an "exit code 1" error with
  // no information.
  private handleError(e: unknown): void {
    if (e instanceof Error && 'stderr' in e) {
      throw new Error(typeof e.stderr === 'string' ? e.stderr : 'Unknown error');
    } else {
      throw new Error('Unknown error');
    }
  }
}
