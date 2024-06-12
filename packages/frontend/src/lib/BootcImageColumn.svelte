<script lang="ts">
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;
</script>

<div class="text-sm text-[var(--pd-table-body-text-highlight)]">
  {object.image}:{object.tag}
</div>
