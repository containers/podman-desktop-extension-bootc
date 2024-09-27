<script lang="ts">
import './app.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { router } from 'tinro';
import Route from './lib/Route.svelte';
import Build from './Build.svelte';
import { onMount } from 'svelte';
import { getRouterState } from './api/client';
import Homepage from './Homepage.svelte';
import { rpcBrowser } from '/@/api/client';
import { Messages } from '/@shared/src/messages/Messages';
import DiskImageDetails from './lib/disk-image/DiskImageDetails.svelte';

router.mode.hash();

let isMounted = false;

onMount(() => {
  // Load router state on application startup
  const state = getRouterState();
  router.goto(state.url);
  isMounted = true;

  return rpcBrowser.subscribe(Messages.MSG_NAVIGATE_BUILD, (x: string) => {
    router.goto(`/build/${x}`);
  });
});
</script>

<Route path="/*" breadcrumb="Bootable Containers" isAppMounted={isMounted} let:meta>
  <main class="flex flex-col w-screen h-screen overflow-hidden bg-[var(--pd-content-bg)]">
    <div class="flex flex-row w-full h-full overflow-hidden">
      <Route path="/" breadcrumb="Bootable Containers">
        <Homepage />
      </Route>
      <Route path="/build" breadcrumb="Build">
        <Build />
      </Route>
      <Route path="/details/:id/*" breadcrumb="Disk Image Details" let:meta>
        <DiskImageDetails id={meta.params.id} />
      </Route>
      <Route path="/build/:name/:tag" breadcrumb="Build" let:meta>
        <Build imageName={decodeURIComponent(meta.params.name)} imageTag={decodeURIComponent(meta.params.tag)} />
      </Route>
    </div>
  </main>
</Route>
