<script lang="ts">
import { router } from 'tinro';
import { bootcClient } from '/@/api/client';
import { Link } from '@podman-desktop/ui-svelte';

export let internalRef: string | undefined = undefined;
export let externalRef: string | undefined = undefined;
export let folder: string | undefined = undefined;
export let title: string | undefined = undefined;

function click() {
  if (internalRef) {
    router.goto(internalRef);
  } else if (externalRef) {
    bootcClient.openLink(externalRef);
  } else if (folder) {
    bootcClient.openFolder(folder);
  }
}
</script>

<Link title="{title}" aria-label="{$$props['aria-label']}" on:click="{() => click()}">
  <slot />
</Link>
