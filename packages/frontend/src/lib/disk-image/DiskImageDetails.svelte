<script lang="ts">
import { DetailsPage, Tab } from '@podman-desktop/ui-svelte';
import { router } from 'tinro';
import DiskImageIcon from '/@/lib/DiskImageIcon.svelte';
import DiskImageDetailsBuild from './DiskImageDetailsBuild.svelte';
import Route from '../Route.svelte';
import DiskImageDetailsSummary from './DiskImageDetailsSummary.svelte';
import { onMount } from 'svelte';
import type { BootcBuildInfo } from '/@shared/src/models/bootc';
import { getTabUrl, isTabSelected } from '../upstream/Util';
import { historyInfo } from '/@/stores/historyInfo';

export let id: string;

let diskImage: BootcBuildInfo;

let detailsPage: DetailsPage;

onMount(() => {
  const actualId = atob(id);
  console.log('id: ' + actualId);
  console.log('hist: ' + historyInfo.subscribe.length);
  return historyInfo.subscribe(value => {
    const matchingImage = value.find(image => image.id === actualId);
    console.log('match: ' + matchingImage?.id);
    if (matchingImage) {
      try {
        diskImage = matchingImage;
      } catch (err) {
        console.error(err);
      }
    } else if (detailsPage) {
      // the disk image has been deleted
      goToHomePage();
    }
  });
});

export function goToHomePage(): void {
  router.goto('/');
}
</script>

<DetailsPage
  bind:this={detailsPage}
  title="{diskImage?.image}:{diskImage?.tag}"
  breadcrumbLeftPart="Bootable Containers"
  breadcrumbRightPart="Disk Image Details"
  breadcrumbTitle="Go back to homepage"
  onclose={goToHomePage}
  onbreadcrumbClick={goToHomePage}>
  <DiskImageIcon slot="icon" size="30px" />
  <svelte:fragment slot="tabs">
    <Tab title="Summary" selected={isTabSelected($router.path, 'summary')} url={getTabUrl($router.path, 'summary')} />
    <Tab title="Build Log" selected={isTabSelected($router.path, 'build')} url={getTabUrl($router.path, 'build')} />
  </svelte:fragment>
  <svelte:fragment slot="content">
    <Route path="/summary" breadcrumb="Summary">
      <DiskImageDetailsSummary image={diskImage} />
    </Route>
    <Route path="/build" breadcrumb="Build Log">
      <DiskImageDetailsBuild folder={diskImage?.folder} />
    </Route>
  </svelte:fragment>
</DetailsPage>
