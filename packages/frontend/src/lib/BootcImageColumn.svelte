<script lang="ts">
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;
</script>

<div class="text-sm text-[var(--pd-table-body-text-highlight)] overflow-hidden text-ellipsis">
  {object.image}:{object.tag}
</div>
