import type { History } from './history';
import * as extensionApi from '@podman-desktop/api';
import * as os from 'node:os';
import { resolve } from 'node:path';

export interface BootcBuildOptionSelection {
  type: string;
  folder: string;
  path: string;
  arch: string;
}

export async function bootcBuildOptionSelection(history: History): Promise<BootcBuildOptionSelection | undefined> {
  const selection = await extensionApi.window.showQuickPick(
    [
      { label: 'QCOW2', detail: 'QEMU image (.qcow2)', format: 'qcow2' },
      { label: 'AMI', detail: 'Amazon Machine Image (.ami)', format: 'ami' },
      { label: 'RAW', detail: 'Raw image (.raw) with an MBR or GPT partition table', format: 'raw' },
      { label: 'ISO', detail: 'ISO standard disk image (.iso) for flashing media and using EFI', format: 'iso' },
    ],
    {
      title: 'Select the type of disk image to create',
    },
  );

  if (!selection) {
    return;
  }

  const selectedType = selection.format;

  const selectionArch = await extensionApi.window.showQuickPick(
    [
      { label: 'ARM64', detail: 'ARM® aarch64 systems', arch: 'arm64' },
      { label: 'AMD64', detail: 'Intel and AMD x86_64 systems', arch: 'amd64' },
    ],
    {
      title: 'Select the architecture',
    },
  );
  if (!selectionArch) {
    return;
  }
  const selectedArch = selectionArch.arch;

  const location = history.getLastFolder() ?? os.homedir();
  const selectedFolder = await extensionApi.window.showInputBox({
    prompt: `Select the folder to generate disk ${selectedType} into`,
    value: location,
    ignoreFocusOut: true,
  });

  if (!selectedFolder) {
    return;
  }

  const imageNameMap = {
    qcow2: 'qcow2/disk.qcow2',
    ami: 'image/disk.raw',
    raw: 'image/disk.raw',
    iso: 'bootiso/disk.iso',
  };

  const imagePath = resolve(selectedFolder, imageNameMap[selectedType]);

  return {
    type: selectedType,
    folder: selectedFolder,
    path: imagePath,
    arch: selectedArch,
  };
}
