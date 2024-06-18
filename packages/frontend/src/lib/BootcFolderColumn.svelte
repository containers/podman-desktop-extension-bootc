<script lang="ts">
import Link from './Link.svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;
</script>

<div class="text-sm text-[var(--pd-table-body-text)] overflow-hidden text-ellipsis">
  <Link folder="{object.folder}">
    {object.folder}
  </Link>
</div>
