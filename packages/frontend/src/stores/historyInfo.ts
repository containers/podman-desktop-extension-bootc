import { derived, writable, type Readable } from 'svelte/store';
import { Messages } from '/@shared/src/messages/Messages';
import { bootcClient } from '/@/api/client';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import { RPCReadable } from '/@/stores/rpcReadable';
import { findMatchInLeaves } from '../lib/upstream/search-util';

export const historyInfo: Readable<BootcBuildInfo[]> = RPCReadable<BootcBuildInfo[]>(
  [],
  [Messages.MSG_HISTORY_UPDATE],
  bootcClient.listHistoryInfo,
);

// For searching
export const searchPattern = writable('');

export const filtered = derived([searchPattern, historyInfo], ([$searchPattern, $historyInfo]) =>
  $historyInfo.filter(historyInfo => findMatchInLeaves(historyInfo, $searchPattern.toLowerCase())),
);
