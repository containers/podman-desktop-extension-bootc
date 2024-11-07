<script lang="ts">
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import DiskImageActions from './DiskImageActions.svelte';

export let object: BootcBuildInfo;
</script>

<DiskImageActions object={object} on:update />
