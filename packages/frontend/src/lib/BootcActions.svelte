<script lang="ts">
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import ListItemButtonIcon from './upstream/ListItemButtonIcon.svelte';
import { faFileAlt, faTrash } from '@fortawesome/free-solid-svg-icons';
import { router } from 'tinro';
import { bootcClient } from '../api/client';

export let object: BootcBuildInfo;
export let detailed = false;

// Delete the build
async function deleteBuild(): Promise<void> {
  await bootcClient.deleteBuilds([object]);
}

// Navigate to the build
async function gotoLogs(): Promise<void> {
  // Convert object.folder to base64
  const base64FolderLocation = btoa(object.folder);
  const base64BuildImageName = btoa(object.image);
  router.goto(`/logs/${base64BuildImageName}/${base64FolderLocation}`);
}
</script>

<ListItemButtonIcon title="Build Logs" onClick={() => gotoLogs()} detailed={detailed} icon={faFileAlt} />
<ListItemButtonIcon title="Delete Build" onClick={() => deleteBuild()} detailed={detailed} icon={faTrash} />
