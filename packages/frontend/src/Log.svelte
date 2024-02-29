<script lang="ts">
import { onMount } from 'svelte';
import FormPage from './lib/upstream/FormPage.svelte';
import type { BootcHistoryInfo } from '@shared/src/models/bootc';
import { bootcClient } from './api/client';

export let containerId: string;
let builds: BootcHistoryInfo[] = [];
let content: string;
let logContent: string;
let title: string = 'Logs';

// onMount, use listHistoryInfo, find the containerId and display the log
// if the containerId is not found, display a message that the containerId is not found
// if the containerId is found, display the log
onMount(async () => {
  builds = await bootcClient.listHistoryInfo();
  // Find the build with the containerId
  // as the log would only exist if container was actually ran
  let build = builds.find(build => build.buildContainerId === containerId);
  if (build) {
    title = `Logs for ${build.image}:${build.tag} from ${build.location}`;
    logContent = await bootcClient.getBuildLog(build.location);
  }
});

$: content = logContent;
</script>

<FormPage title="{title}" showBreadcrumb="{true}">
  <svelte:fragment slot="icon">
    <i class="fas fa-rocket fa-2x" aria-hidden="true"></i>
  </svelte:fragment>

  <!-- content is all just a long json file, make it look pretty / output within the form -->
  <div slot="content" class="px-5 py-4 h-full w-full overflow-auto">
    <pre class="text-xs text-gray-500">{content}</pre>
  </div>
</FormPage>
