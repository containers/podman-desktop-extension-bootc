<script lang="ts">
import BootcStatusIcon from './BootcStatusIcon.svelte';
import DiskImageIcon from './DiskImageIcon.svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;
</script>

<BootcStatusIcon icon={DiskImageIcon} status={object.status} />
