<script lang="ts">
import BootcStatusIcon from './BootcStatusIcon.svelte';
import BootcIcon from './BootcIcon.svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';

export let object: BootcBuildInfo;
</script>

<BootcStatusIcon icon="{BootcIcon}" status="{object.status}" />
