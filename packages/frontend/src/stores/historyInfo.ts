import type { Readable } from 'svelte/store';
import { Messages } from '/@shared/src/messages/Messages';
import { bootcClient } from '/@/api/client';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import { RPCReadable } from '/@/stores/rpcReadable';

export const historyInfo: Readable<BootcBuildInfo[]> = RPCReadable<BootcBuildInfo[]>(
  [],
  [Messages.MSG_HISTORY_UPDATE],
  bootcClient.listHistoryInfo,
);
