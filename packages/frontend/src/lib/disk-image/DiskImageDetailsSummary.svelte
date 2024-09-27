<script lang="ts">
import Table from '/@/lib/upstream/DetailsTable.svelte';
import Title from '/@/lib/upstream/DetailsTitle.svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import Cell from '/@/lib/upstream/DetailsCell.svelte';
import Link from '../Link.svelte';

export let image: BootcBuildInfo | undefined;
</script>

<Table>
  <tr>
    <Title>Details</Title>
  </tr>
  {#if image}
    <tr>
      <Cell>Source image</Cell>
      <Cell>{image.image}:{image.tag}</Cell>
    </tr>
    <tr>
      <Cell>Disk image type</Cell>
      <Cell>{image.type}</Cell>
    </tr>
    <tr>
      <Cell>Architecture</Cell>
      <Cell>{image.arch}</Cell>
    </tr>
    <tr>
      <Cell>Folder</Cell>
      <Cell
        ><Link folder={image.folder}>
          {image.folder}
        </Link></Cell>
    </tr>
  {/if}
</Table>
