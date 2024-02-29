<script lang="ts">
import { onMount } from 'svelte';
import type { BootcHistoryInfo } from '@shared/src/models/bootc';
import { createEventDispatcher } from 'svelte';
import ListItemButtonIcon from './upstream/ListItemButtonIcon.svelte';
import { faFileAlt, faTrash } from '@fortawesome/free-solid-svg-icons';
import { bootcClient } from '../api/client';
import Route from './Route.svelte';
import { router } from 'tinro';

export let bootcImageHistory: BootcHistoryInfo;
export let detailed = false;

const dispatch = createEventDispatcher<{ update: BootcHistoryInfo }>();

// Removes the image history from the list
async function removeBuild(): Promise<void> {
  dispatch('update', bootcImageHistory);
  await bootcClient.deleteBuild(
    bootcImageHistory.image,
    bootcImageHistory.tag,
    bootcImageHistory.type,
    bootcImageHistory.arch,
    bootcImageHistory.buildContainerId,
  );
}

async function goToContainerLogs(): Promise<void> {
  dispatch('update', bootcImageHistory);
  await bootcClient.navigateToContainerLogs(bootcImageHistory.buildContainerId);
}

async function goToBuildLogs(): Promise<void> {
  dispatch('update', bootcImageHistory);
  router.goto(`/log/${bootcImageHistory.buildContainerId}`);
}
</script>

<!-- Show THIS log if the build is running and the container id exists -->
{#if bootcImageHistory.buildContainerId && bootcImageHistory.status === 'running'}
  <ListItemButtonIcon
    title="View Container Logs"
    onClick="{() => goToContainerLogs()}"
    detailed="{detailed}"
    icon="{faFileAlt}" />
{:else if bootcImageHistory.buildContainerId}
  <ListItemButtonIcon title="View Logs" onClick="{() => goToBuildLogs()}" detailed="{detailed}" icon="{faFileAlt}" />
{/if}

<!-- TODO: Add a button that will take you to the build log that was generated once it exited instead, perhaps a view that shows monaco editor? Unsure 100%.-->

<!-- Add button to open output directory -->
<ListItemButtonIcon title="Delete Build" onClick="{() => removeBuild()}" detailed="{detailed}" icon="{faTrash}" />
