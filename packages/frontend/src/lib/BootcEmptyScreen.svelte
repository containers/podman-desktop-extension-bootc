<script lang="ts">
import EmptyScreen from './upstream/EmptyScreen.svelte';
import BootcIcon from './BootcIcon.svelte';
</script>

<EmptyScreen
  icon="{BootcIcon}"
  title="No past bootc build available"
  message="Start your first build by clicking the 'Build' button" />
