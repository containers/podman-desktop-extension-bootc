<script lang="ts">
import type { BootcHistoryInfo, BootcBuildStatus } from '@shared/src/models/bootc';

export let object: BootcHistoryInfo;

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
      return 'Build successful';
    case 'creating':
      return 'Creating build container';
    case 'deleting':
      return 'Deleting build container';
    case 'running':
      return 'Currently building';
    case 'error':
      return 'Build failure, see log file';
    case 'lost':
      return 'Build container lost, try again';
    default:
      return 'Unknown';
  }
}
</script>

<div class="flex flex-row gap-1">
  <div class="flex flex-row bg-charcoal-500 items-center p-1 rounded-md text-xs text-gray-500">
    <div class="w-2 h-2 {getConditionColour(object.status)} rounded-full mr-1"></div>
    {explainCondition(object.status)}
  </div>
</div>
