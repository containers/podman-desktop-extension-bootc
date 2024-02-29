<script lang="ts">
import { onMount } from 'svelte';
import { router } from 'tinro';
import type { BootcHistoryInfo } from '@shared/src/models/bootc';
import NavPage from './lib/upstream/NavPage.svelte';
import NoBootcImagesEmptyScreen from './lib/NoBootcImagesEmptyScreen.svelte';
import Button from './lib/upstream/Button.svelte';
import { faCube, faCubes, faPlusCircle, faTrash } from '@fortawesome/free-solid-svg-icons';
import Table from './lib/upstream/Table.svelte';
import { Column, Row } from './lib/upstream/table';
import BootcColumnActions from './lib/BootcColumnActions.svelte';
import { bootcClient } from './api/client';
import SimpleColumn from './lib/upstream/SimpleColumn.svelte';
import BootcStatus from './lib/BootcStatus.svelte';
import BootcNameColumn from './lib/BootcNameColumn.svelte';
import BootcCurrentProgress from './lib/BootcCurrentProgress.svelte';

export let searchTerm = '';

let builds: BootcHistoryInfo[] = [];

onMount(async () => {
  // Check for any lost builds when the page initially loads, this helps "find"
  // or mark any containers as lost when PD unexpectedly restarts during a build process
  // and the container is lost. For example, the container completes its "build"
  // while PD is closed and we are not monitoring for changes.
  // TODO: This needs to be fixed up...
  // we HAVE to have podman desktop running while extension is checking for builds / running.
  // if you close it during a build, there is no way to report "success" or "failure" status
  // BACK to the extension from "outside" of PD.
  //await bootcClient.recoverLostBuilds();

  // Get all the information
  builds = await bootcClient.listHistoryInfo();

  // TODO / add to a "stores" client in the future, but simply call listHistoryInfo() to builds
  // every 2 seconds in order to get the status of the build, for as long as we are on the List page.
  setInterval(async () => {
    let newBuilds = await bootcClient.listHistoryInfo();
    // Only update if there are changes between the two
    if (JSON.stringify(builds) !== JSON.stringify(newBuilds)) {
      builds = newBuilds;
    }
  }, 2000);
});

// delete the items selected in the list
let bulkDeleteInProgress = false;
async function deleteSelectedBuilds() {
  const selectedDeployments = builds.filter(build => build.selected);
  if (selectedDeployments.length === 0) {
    return;
  }

  // mark deployments for deletion
  bulkDeleteInProgress = true;
  selectedDeployments.forEach(build => (build.status = 'deleting'));
  builds = builds;

  await Promise.all(
    selectedDeployments.map(async build => {
      try {
        await bootcClient.deleteBuild(build.image, build.tag, build.type, build.arch, build.buildContainerId);
      } catch (e) {
        console.error('error while deleting build history', e);
      }
    }),
  );
  bulkDeleteInProgress = false;
}

async function gotoBuild(): Promise<void> {
  router.goto('/build');
}

async function deleteAll(): Promise<void> {
  await bootcClient.deleteAll();
}

let selectedItemsNumber: number;
let table: Table;

// COLUMNS

let statusColumn = new Column<BootcHistoryInfo>('Status', {
  align: 'center',
  width: '70px',
  renderer: BootcStatus,
  comparator: (a, b) => b.status.localeCompare(a.status),
});

let nameColumn = new Column<BootcHistoryInfo, string>('Image', {
  width: '2fr',
  renderMapping: object => object.image,
  renderer: BootcNameColumn,
  comparator: (a, b) => a.image.localeCompare(b.image),
});

let tagColumn = new Column<BootcHistoryInfo, string>('Tag', {
  renderMapping: object => object.tag,
  renderer: SimpleColumn,
  comparator: (a, b) => a.tag.localeCompare(b.tag),
});

let progressColumn = new Column<BootcHistoryInfo>('Progress', {
  width: '2fr',
  overflow: true,
  renderer: BootcCurrentProgress,
});

let typeColumn = new Column<BootcHistoryInfo, string>('Type', {
  renderMapping: object => object.type,
  renderer: SimpleColumn,
  comparator: (a, b) => a.type.localeCompare(b.type),
});

let archColumn = new Column<BootcHistoryInfo, string>('Arch', {
  renderMapping: object => object.arch,
  renderer: SimpleColumn,
  comparator: (a, b) => a.arch.localeCompare(b.arch),
});

let locationColumn = new Column<BootcHistoryInfo, string>('Folder', {
  renderMapping: object => object.location,
  renderer: SimpleColumn,
  comparator: (a, b) => a.location.localeCompare(b.location),
});

const columns: Column<BootcHistoryInfo, BootcHistoryInfo | string>[] = [
  statusColumn,
  nameColumn,
  tagColumn,
  progressColumn,
  typeColumn,
  archColumn,
  locationColumn,
  new Column<BootcHistoryInfo>('Actions', { align: 'right', renderer: BootcColumnActions, overflow: true }),
];

const row = new Row<BootcHistoryInfo>({
  selectable: _build => true,
});
</script>

<NavPage bind:searchTerm="{searchTerm}" title="BootC (Bootable Container) Image Builder" searchEnabled="{true}">
  <svelte:fragment slot="additional-actions">
    <!-- Only show the prune button if there is actually items to prune. -->
    {#if builds.length > 0}
      <Button on:click="{() => deleteAll()}" icon="{faTrash}" title="Prune all builds">Prune build history</Button>
    {/if}
    <Button on:click="{() => gotoBuild()}" icon="{faCube}" title="Build">Build</Button>
  </svelte:fragment>

  <svelte:fragment slot="bottom-additional-actions">
    {#if selectedItemsNumber > 0}
      <Button
        on:click="{() => deleteSelectedBuilds()}"
        title="Delete {selectedItemsNumber} selected items"
        inProgress="{bulkDeleteInProgress}"
        icon="{faTrash}" />
      <span>On {selectedItemsNumber} selected items.</span>
    {/if}
  </svelte:fragment>

  <div class="flex min-w-full h-full" slot="content">
    <Table
      kind="bootc images"
      bind:this="{table}"
      bind:selectedItemsNumber="{selectedItemsNumber}"
      data="{builds}"
      columns="{columns}"
      row="{row}"
      defaultSortColumn="Name"
      on:update="{() => (builds = builds)}">
    </Table>

    {#if builds.length === 0}
      <NoBootcImagesEmptyScreen />
    {/if}
  </div>
</NavPage>
