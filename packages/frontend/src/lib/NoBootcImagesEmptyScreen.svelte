<script lang="ts">
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen } from '@podman-desktop/ui-svelte';
</script>

<EmptyScreen
  title="No Bootable Container builds have been created yet"
  message="Click on 'Build' to start your first build!"
  icon={faLayerGroup} />
