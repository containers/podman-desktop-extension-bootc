<script lang="ts">
import type { BootcHistoryInfo } from '@shared/src/models/bootc';
import BootcActions from './BootcActions.svelte';

export let object: BootcHistoryInfo;
</script>

<BootcActions bootcImageHistory="{object}" on:update />
