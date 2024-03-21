<script lang="ts">
import './app.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { router } from 'tinro';
import Route from './lib/Route.svelte';
import Build from './Build.svelte';
import { onMount } from 'svelte';
import { getRouterState } from './api/client';
import Homepage from './Homepage.svelte';

router.mode.hash();

let isMounted = false;

onMount(() => {
  // Load router state on application startup
  const state = getRouterState();
  router.goto(state.url);
  isMounted = true;
});
</script>

<Route path="/*" breadcrumb="Home" isAppMounted="{isMounted}" let:meta>
  <main class="flex flex-col w-screen h-screen overflow-hidden bg-charcoal-700">
    <div class="flex flex-row w-full h-full overflow-hidden">
      <Route path="/" breadcrumb="Homepage">
        <Homepage />
      </Route>
      <Route path="/build" breadcrumb="Build">
        <Build />
      </Route>
    </div>
  </main>
</Route>
