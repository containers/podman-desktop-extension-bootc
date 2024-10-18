<script lang="ts">
import Label from '/@/lib/upstream/Label.svelte';

export let status: string;

function getClassColor(): string {
  if (status.includes('VM stopped') || status.includes('VM error') || status.includes('VM launch error')) {
    return 'bg-[var(--pd-status-disconnected)]';
  }
  return 'bg-[var(--pd-status-connected)]';
}
</script>

{#if status}
  <Label role="status" name={status}><div class="w-2 h-2 {getClassColor()} rounded-full mx-1"></div></Label>
{/if}
