<script lang="ts">
import { bootcClient } from '../api/client';
import { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;

function openFolder(folder: string) {
  bootcClient.openFolder(folder);
}
</script>

<button class="hover:cursor-pointer flex flex-col" on:click="{() => openFolder(object.folder)}">
  <div class="text-sm text-violet-400">{object.folder}</div>
</button>
