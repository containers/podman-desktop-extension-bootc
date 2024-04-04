<script lang="ts">
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;
</script>

<div class="text-sm text-gray-300">
  {object.image}:{object.tag}
</div>
