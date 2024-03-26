import { describe, test, expect, vi, beforeAll } from 'vitest';
import { bootcBuildOptionSelection } from './quickpicks'; // Update with the actual new file name
import * as extensionApi from '@podman-desktop/api';
import * as os from 'node:os';
import * as path from 'node:path';
import { History } from './history'; // Assuming this is the correct path

vi.mock('@podman-desktop/api', async () => {
  return {
    window: {
      showQuickPick: vi.fn(),
      showInputBox: vi.fn(),
    },
  };
});

// "Fake" the history file
vi.mock('node:fs', async () => {
  return {
    existsSync: vi.fn().mockImplementation(() => true),
    readFile: vi.fn().mockImplementation(() => '[]'),
    writeFile: vi.fn().mockImplementation(() => Promise.resolve()),
    mkdir: vi.fn().mockImplementation(() => Promise.resolve()),
  };
});

beforeAll(async () => {});

describe('bootcBuildOptionSelection', () => {
  test('Check that selections are shown correctly for the first pick (selecting images)', async () => {
    // Before all, add an example "entry" to the history
    // so we can test the getLastFolder function

    // Create a temporary file to use for the example history
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `tempfile-${Date.now()}`);

    const history = new History(tempFilePath);
    await history.addOrUpdateBuildInfo({
      id: 'name1',
      image: 'exampleImage',
      tag: 'exampleTag',
      engineId: 'exampleEngineId',
      type: 'exampleType',
      folder: '/example/fake/folder',
      arch: 'exampleArch',
      status: 'success',
    });

    const showQuickPickMock = vi.spyOn(extensionApi.window, 'showQuickPick');

    // First call to showQuickPick (disk image type selection)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showQuickPickMock.mockResolvedValueOnce({ label: 'QCOW2', detail: 'QEMU image (.qcow2)', format: 'qcow2' } as any);

    // Second call to showQuickPick (architecture selection)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showQuickPickMock.mockResolvedValueOnce({ label: 'ARM64', detail: 'ARM® aarch64 systems', arch: 'arm64' } as any);

    // Third call to showInputBox (folder selection)
    vi.spyOn(extensionApi.window, 'showInputBox').mockResolvedValueOnce('/path/to/fake/storage');

    // This function is asynchronous, so make sure to await it
    await bootcBuildOptionSelection(history);

    // Check the first call for selecting the disk image type
    expect(showQuickPickMock).toHaveBeenNthCalledWith(
      1, // This indicates the first call
      [
        { label: 'QCOW2', detail: 'QEMU image (.qcow2)', format: 'qcow2' },
        { label: 'AMI', detail: 'Amazon Machine Image (.ami)', format: 'ami' },
        { label: 'RAW', detail: 'Raw image (.raw) with an MBR or GPT partition table', format: 'raw' },
        { label: 'VMDK', detail: 'Virtual Machine Disk image (.vmdk)', format: 'vmdk' },
        { label: 'ISO', detail: 'ISO standard disk image (.iso) for flashing media and using EFI', format: 'iso' },
      ],
      {
        title: 'Select the type of disk image to create',
      },
    );

    // Check the second call for selecting the architecture
    expect(showQuickPickMock).toHaveBeenNthCalledWith(
      2, // This indicates the second call
      [
        { label: 'ARM64', detail: 'ARM® aarch64 systems', arch: 'arm64' },
        { label: 'AMD64', detail: 'Intel and AMD x86_64 systems', arch: 'amd64' },
      ],
      {
        title: 'Select the architecture',
      },
    );

    // Check the third call for selecting the folder
    expect(extensionApi.window.showInputBox).toHaveBeenCalledWith({
      prompt: 'Select the folder to generate disk qcow2 into',
      value: '/example/fake/folder',
      ignoreFocusOut: true,
    });
  });
});
