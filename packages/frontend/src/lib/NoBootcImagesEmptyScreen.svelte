<script lang="ts">
import EmptyScreen from './upstream/EmptyScreen.svelte';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons';
</script>

<EmptyScreen
  title="No Bootable Container builds have been created yet"
  message="Click on 'Build' to start your first build!"
  icon="{faLayerGroup}" />
