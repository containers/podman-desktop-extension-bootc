<script lang="ts">
import { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;
</script>

<div class="text-sm text-gray-300">
  {object.name}:{object.tag}
</div>
