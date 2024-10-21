<script lang="ts">
import type { Example } from '../../../shared/src/models/examples';
import { faArrowDown, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { bootcClient } from '../api/client';
import { Button } from '@podman-desktop/ui-svelte';
import { router } from 'tinro';
import DiskImageIcon from './DiskImageIcon.svelte';

export let example: Example;

let pullInProgress = false;

async function openURL(): Promise<void> {
  await bootcClient.openLink(example.repository);
}

async function pullImage(): Promise<void> {
  if (example.image) {
    pullInProgress = true;
    bootcClient.pullImage(example.image);
  }
}

async function gotoBuild(): Promise<void> {
  if (example.image && example.tag) {
    router.goto(`/disk-images/build/${encodeURIComponent(example.image)}/${encodeURIComponent(example.tag)}`);
  }
}

// Make sure if example.pulled is updated, we force a re-render
$: {
  example.state;
}
</script>

<div class="no-underline">
  <div
    class="bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] flex-grow p-4 h-full rounded-md flex-nowrap flex flex-col"
    role="region"
    aria-label={example.name}>
    <!-- Show 'architectures' in small font at the bottom-->
    {#if example.architectures}
      <div class="flex flex-row mb-1">
        <div class="flex-grow text-[var(--pd-content-card-text)] opacity-50 text-xs uppercase">
          {#each example.architectures as architecture}
            <span class="mr-1">{architecture}</span>
          {/each}
        </div>

        <!-- Show example.tag but far right -->
        {#if example.tag}
          <div class="text-[var(--pd-content-card-text)] opacity-50 text-xs uppercase">
            <span>{example.tag}</span>
          </div>
        {/if}
      </div>
    {/if}

    <!-- body -->
    <div class="flex flex-row text-base grow">
      <!-- left column -->
      <div class="flex flex-col grow">
        <span class="text-[var(--pd-content-card-header-text)]">{example.name}</span>
        <span class="text-sm text-[var(--pd-content-card-text)]">{example.description}</span>
      </div>
    </div>

    <!-- footer -->
    <div class="flex flex-row mt-2 items-center justify-end">
      <Button
        on:click={openURL}
        icon={faArrowUpRightFromSquare}
        aria-label="Source"
        title="Source"
        type="link"
        class="mr-2">Source</Button>

      {#if !example.state || example.state === 'unpulled'}
        <Button
          on:click={pullImage}
          icon={faArrowDown}
          aria-label="Pull image"
          title="Pull image"
          inProgress={pullInProgress}>Pull image</Button>
      {:else if example.state === 'pulled'}
        <Button on:click={gotoBuild} icon={DiskImageIcon} aria-label="Build image" title="Build image"
          >Build image</Button>
      {/if}
    </div>
  </div>
</div>
