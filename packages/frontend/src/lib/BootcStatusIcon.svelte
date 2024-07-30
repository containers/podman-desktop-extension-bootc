<script lang="ts">
import { Spinner } from '@podman-desktop/ui-svelte';
import { StarIcon } from '@podman-desktop/ui-svelte/icons';

// status: one of running, success, error
// any other status will result in a standard outlined box
export let status = '';
export let icon: any = undefined;
export let size = 20;

$: solid =
  status === 'running' ||
  status === 'success' ||
  status === 'error' ||
  status === 'lost' ||
  status === 'creating' ||
  status === 'deleting';
</script>

<div class="grid place-content-center" style="position:relative">
  <div
    class="grid place-content-center rounded aspect-square text-xs"
    class:bg-green-600="{status === 'success'}"
    class:bg-sky-400="{status === 'running'}"
    class:bg-red-600="{status === 'error'}"
    class:bg-amber-600="{status === 'lost'}"
    class:p-0.5="{!solid}"
    class:p-1="{solid}"
    class:border-gray-700="{!solid}"
    class:text-[var(--pd-status-not-running)]="{!solid}"
    class:text-[var(--pd-status-contrast)]="{solid}"
    role="status"
    title="{status}">
    {#if status === 'running' || status === 'creating' || status === 'deleting'}
      <Spinner size="1.4em" />
    {:else if typeof icon === 'string'}
      <span class="{icon}" aria-hidden="true"></span>
    {:else}
      <svelte:component this="{icon}" size="{size}" solid="{solid}" />
    {/if}
  </div>
  {#if status === 'success'}
    <StarIcon size="8" style="position:absolute;top:0;right:0" />
  {/if}
</div>
