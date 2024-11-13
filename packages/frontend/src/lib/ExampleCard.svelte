<script lang="ts">
import type { Example } from '/@shared/src/models/examples';
import { faArrowDown, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { bootcClient } from '/@/api/client';
import { Button } from '@podman-desktop/ui-svelte';
import { router } from 'tinro';
import DiskImageIcon from './DiskImageIcon.svelte';
import { filesize } from 'filesize';

interface Props {
  example: Example;
}

let { example }: Props = $props();

let pullInProgress = $state(false);

async function openURL(): Promise<void> {
  //await bootcClient.openLink(example.repository);
  router.goto(`/example/${example.id}`);
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

        {#if example.size}
          <div class="text-[var(--pd-content-card-text)] opacity-50 text-xs uppercase mr-1">
            <span>{filesize(example.size)}</span>
          </div>
        {/if}

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
        aria-label="MoreDetails"
        title="More Details"
        type="link"
        class="mr-2">More Details</Button>

      {#if example?.state === 'pulled'}
        <Button on:click={gotoBuild} icon={DiskImageIcon} aria-label="Build image" title="Build image" class="w-28"
          >Build image</Button>
      {:else if example?.state === 'unpulled'}
        <Button
          on:click={pullImage}
          icon={faArrowDown}
          aria-label="Pull image"
          title="Pull image"
          inProgress={pullInProgress}>Pull image</Button>
      {:else}
        <!-- Show a spinner / in progress for querying button instead if we are still loading information-->
        <Button icon={faArrowDown} aria-label="Querying" title="Querying" inProgress={true}>Querying</Button>
      {/if}
    </div>
  </div>
</div>
