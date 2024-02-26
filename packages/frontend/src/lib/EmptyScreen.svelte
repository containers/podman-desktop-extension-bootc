<script lang="ts">
import Fa from 'svelte-fa';
import { onMount } from 'svelte';

export let icon: any;
export let title = 'No title';
export let message = 'Message';
export let detail = '';
export let hidden = false;

let fontAwesomeIcon = false;
let processed = false;

onMount(() => {
  if (icon?.prefix === 'fas') {
    fontAwesomeIcon = true;
  }
  processed = true;
});
</script>

<div
  class="flex flex-row w-full h-full justify-center {$$props.class || ''}"
  class:hidden="{hidden}"
  style="{$$props.style}"
  aria-label="{$$props['aria-label']}">
  <div class="flex flex-col h-full justify-center text-center space-y-3">
    <div class="flex justify-center text-gray-700 py-2">
      {#if processed}
        {#if fontAwesomeIcon}
          <Fa icon="{icon}" size="4x" />
        {:else}
          <svelte:component this="{icon}" size="55" solid="{false}" />
        {/if}
      {/if}
    </div>
    <h1 class="text-xl">{title}</h1>
    <span class="text-gray-700">{message}</span>
    {#if detail}
      <span class="text-gray-700">{detail}</span>
    {/if}
    {#if $$slots}
      <div class="py-2">
        <slot />
      </div>
    {/if}
  </div>
</div>
