<script lang="ts">
import type { BootcBuildInfo, BootcBuildStatus } from '/@shared/src/models/bootc';
import { bootcClient } from '../api/client';

export let object: BootcBuildInfo;

// Each status associated to a colour
// bg-green-600 = Success
// bg-sky-400 = Running
// bg-amber-600 = Error
function getConditionColour(status: BootcBuildStatus): string {
  switch (status) {
    case 'success':
      return 'bg-green-600';
    case 'creating':
      return 'bg-gray-900';
    case 'deleting':
      return 'bg-gray-900';
    case 'running':
      return 'bg-sky-400';
    case 'error':
      return 'bg-red-600';
    case 'lost':
      return 'bg-amber-600';
    default:
      return 'bg-gray-900';
  }
}

function explainCondition(status: BootcBuildStatus): string {
  switch (status) {
    case 'success':
      return 'Successful';
    case 'creating':
      return 'Creating';
    case 'deleting':
      return 'Deleting';
    case 'running':
      return 'Building';
    case 'error':
      return 'Failure (see log)';
    case 'lost':
      return 'Lost (try again)';
    default:
      return 'Unknown';
  }
}

async function goToContainerLogs(): Promise<void> {
  if (object.buildContainerId) {
    await bootcClient.navigateToContainerLogs(object.buildContainerId);
  }
}
</script>

{#if object.status}
  <div class="flex flex-row gap-1">
    <div class="flex flex-row bg-charcoal-500 items-center p-1 rounded-md text-xs text-gray-500">
      <div class="w-2 h-2 {getConditionColour(object.status)} rounded-full mr-1"></div>
      {explainCondition(object.status)}
      {#if object.status == 'running'}
        <button class="hover:cursor-pointer flex flex-col" on:click="{() => goToContainerLogs()}">
          <div class="text-xs ml-1 text-violet-400">(view logs)</div>
        </button>
      {/if}
    </div>
  </div>
{/if}
