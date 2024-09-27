<script lang="ts">
import { router } from 'tinro';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;

function openDetails() {
  router.goto(`/details/${btoa(object.id)}/summary`);
}
</script>

<button class="hover:cursor-pointer flex flex-col max-w-full" on:click={() => openDetails()}>
  <div class="text-[var(--pd-table-body-text-highlight)] max-w-full overflow-hidden text-ellipsis">
    {object.image}:{object.tag}
  </div>
</button>
