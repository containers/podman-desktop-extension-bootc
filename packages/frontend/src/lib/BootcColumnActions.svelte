<script lang="ts">
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import BootcActions from './BootcActions.svelte';

export let object: BootcBuildInfo;
</script>

<BootcActions object={object} on:update />
