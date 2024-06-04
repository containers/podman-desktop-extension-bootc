<script lang="ts">
import { bootcClient } from '../api/client';
import Link from './Link.svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;

function openFolder(folder: string) {
  bootcClient.openFolder(folder);
}
</script>

<div class="text-sm">
  <Link folder="{object.folder}">
    {object.folder}
  </Link>
</div>
