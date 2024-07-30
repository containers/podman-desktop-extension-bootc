<script lang="ts">
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import ListItemButtonIcon from './upstream/ListItemButtonIcon.svelte';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { bootcClient } from '../api/client';

export let object: BootcBuildInfo;
export let detailed = false;

// Delete the build
async function deleteBuild(): Promise<void> {
  await bootcClient.deleteBuilds([object]);
}
</script>

<ListItemButtonIcon title="Delete Build" onClick="{() => deleteBuild()}" detailed="{detailed}" icon="{faTrash}" />
