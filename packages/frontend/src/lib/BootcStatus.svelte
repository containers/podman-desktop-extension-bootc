<script lang="ts">
import BootcStatusIcon from './BootcStatusIcon.svelte';
import BootcIcon from './BootcIcon.svelte';
import type { BootcHistoryInfo } from '@shared/src/models/bootc';

export let object: BootcHistoryInfo;
</script>

<BootcStatusIcon icon="{BootcIcon}" status="{object.status}" />
