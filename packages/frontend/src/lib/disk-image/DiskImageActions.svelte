<script lang="ts">
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import ListItemButtonIcon from '/@/lib/upstream/ListItemButtonIcon.svelte';
import { faFileAlt, faTrash } from '@fortawesome/free-solid-svg-icons';
import { router } from 'tinro';
import { bootcClient } from '/@/api/client';

export let object: BootcBuildInfo;
export let detailed = false;

// Delete the build
async function deleteBuild(): Promise<void> {
  await bootcClient.deleteBuilds([object]);
}

// Navigate to the build
async function gotoLogs(): Promise<void> {
  router.goto(`/disk-image/${btoa(object.id)}/build`);
}
</script>

<ListItemButtonIcon title="Build Logs" onClick={() => gotoLogs()} detailed={detailed} icon={faFileAlt} />
<ListItemButtonIcon title="Delete Build" onClick={() => deleteBuild()} detailed={detailed} icon={faTrash} />
