<script lang="ts">
import { bootcClient } from '../api/client';
import Link from './upstream/Link.svelte';
import { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;

function openFolder(folder: string) {
  bootcClient.openFolder(folder);
}
</script>

<Link class="flex flex-col text-sm" on:click="{() => openFolder(object.folder)}">
  {object.folder}
</Link>
