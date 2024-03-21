<script lang="ts">
import EmptyScreen from './upstream/EmptyScreen.svelte';
import BootcIcon from './BootcIcon.svelte';
</script>

<EmptyScreen
  icon="{BootcIcon}"
  title="No bootable container builds found"
  message="Start your first build by clicking the 'Build' button" />
