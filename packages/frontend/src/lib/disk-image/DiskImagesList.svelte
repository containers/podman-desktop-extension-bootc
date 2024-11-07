<script lang="ts">
import { onMount } from 'svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import DiskImageColumnActions from './DiskImageColumnActions.svelte';
import { bootcClient } from '/@/api/client';
import BootcStatus from '../BootcStatus.svelte';
import { searchPattern, filtered } from '../../stores/historyInfo';
import DiskImageIcon from '../DiskImageIcon.svelte';
import DiskImageColumnFolder from './DiskImageColumnFolder.svelte';
import DiskImageColumnImage from './DiskImageColumnImage.svelte';
import {
  Button,
  Table,
  TableColumn,
  TableRow,
  TableSimpleColumn,
  NavPage,
  FilteredEmptyScreen,
} from '@podman-desktop/ui-svelte';
import DiskImageEmptyScreen from './DiskImageEmptyScreen.svelte';
import { gotoBuild } from '../navigation';

// Search functionality
export let searchTerm = '';
$: searchPattern.set(searchTerm);

let history: BootcBuildInfoWithSelected[] = [];

interface BootcBuildInfoWithSelected extends BootcBuildInfo {
  selected: boolean;
}

onMount(() => {
  return filtered.subscribe(value => {
    history = value.map(build => ({ ...build, selected: false }));
  });
});

// Bulk delete the selected builds
let bulkDeleteInProgress = false;
async function deleteSelectedBuilds() {
  const selected = history.filter(history => history.selected);
  if (selected.length === 0) {
    return;
  }

  // mark builds for deletion
  bulkDeleteInProgress = true;

  // Delete all the selected builds
  await bootcClient.deleteBuilds(selected);
  bulkDeleteInProgress = false;
}

let selectedItemsNumber: number;
let table: Table;

// COLUMNS
let statusColumn = new TableColumn<BootcBuildInfo>('Status', {
  align: 'center',
  width: '70px',
  renderer: BootcStatus,
});

let imageColumn = new TableColumn<BootcBuildInfo>('Image', {
  width: '2fr',
  renderer: DiskImageColumnImage,
  comparator: (a, b) => a.image.localeCompare(b.image),
});

let typeColumn = new TableColumn<BootcBuildInfo, string>('Type', {
  renderMapping: object => object.type.join(),
  renderer: TableSimpleColumn,
  comparator: (a, b) => a.type.join().localeCompare(b.type.join()),
});

let archColumn = new TableColumn<BootcBuildInfo, string>('Arch', {
  renderMapping: object => object.arch ?? '',
  renderer: TableSimpleColumn,
  comparator: (a, b) => {
    if (a.arch && b.arch) {
      return a.arch.localeCompare(b.arch);
    } else if (a.arch) {
      return 1;
    }
    return -1;
  },
});

let folderColumn = new TableColumn<BootcBuildInfo>('Folder', {
  renderer: DiskImageColumnFolder,
  comparator: (a, b) => a.folder.localeCompare(b.folder),
});

const columns = [
  statusColumn,
  imageColumn,
  typeColumn,
  archColumn,
  folderColumn,
  new TableColumn<BootcBuildInfo>('Actions', { align: 'right', renderer: DiskImageColumnActions, overflow: true }),
];

const row = new TableRow<BootcBuildInfo>({
  selectable: _build => true,
});
</script>

<NavPage bind:searchTerm={searchTerm} title="Disk Images" searchEnabled={true}>
  <svelte:fragment slot="additional-actions">
    <Button on:click={gotoBuild} icon={DiskImageIcon} title="Build">Build</Button>
  </svelte:fragment>

  <svelte:fragment slot="bottom-additional-actions">
    {#if selectedItemsNumber > 0}
      <Button
        on:click={() => deleteSelectedBuilds()}
        title="Delete {selectedItemsNumber} selected items"
        inProgress={bulkDeleteInProgress}
        icon={faTrash} />
      <span>On {selectedItemsNumber} selected items.</span>
    {/if}
  </svelte:fragment>

  <div class="flex min-w-full h-full" slot="content">
    <Table
      kind="disk images"
      bind:this={table}
      bind:selectedItemsNumber={selectedItemsNumber}
      data={history}
      columns={columns}
      row={row}
      defaultSortColumn="Name"
      on:update={() => (history = history)}>
    </Table>

    {#if $filtered.length === 0 && searchTerm}
      <FilteredEmptyScreen icon={DiskImageIcon} kind="disk images" bind:searchTerm={searchTerm} />
    {:else if history.length === 0}
      <DiskImageEmptyScreen />
    {/if}
  </div>
</NavPage>
