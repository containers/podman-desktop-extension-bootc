<script lang="ts">
import Card from './Card.svelte';
import ExampleCard from './ExampleCard.svelte';
import type { Example, Category } from '../../../shared/src/models/examples';
import { onMount } from 'svelte';
import { bootcClient, rpcBrowser } from '../api/client';
import type { ImageInfo } from '@podman-desktop/api';
import { Messages } from '/@shared/src/messages/Messages';

export let category: Category;
export let examples: Example[];
let bootcAvailableImages: ImageInfo[] = [];

onMount(async () => {
  bootcAvailableImages = await bootcClient.listBootcImages();
  updateExamplesWithPulledImages();

  // Update the available bootc images if we receive a msg image pull update from the UI
  return rpcBrowser.subscribe(Messages.MSG_IMAGE_PULL_UPDATE, async msg => {
    bootcAvailableImages = await bootcClient.listBootcImages();

    if (msg.image) {
      const example = examples.find(example => example.image === msg.image);
      if (example) {
        example.state = 'pulled';
        examples = [...examples];
      }
    }
  });
});

// Function to update examples based on available images
function updateExamplesWithPulledImages() {
  if (bootcAvailableImages) {
    for (const image of bootcAvailableImages) {
      // Only do it if there is a RepoTags
      const [imageRepo, imageTag] = image.RepoTags?.[0]?.split(':') ?? [];
      // Find by image name and tag if it's in the list of examples
      const example = examples.find(example => example.image === imageRepo && example.tag === imageTag);
      if (example) {
        example.state = 'pulled';
        examples = [...examples];
      }
    }
  }
}

// Reactive statement to call the function each time bootcAvailableImages updates
$: if (bootcAvailableImages) {
  updateExamplesWithPulledImages();
}
</script>

<Card title={category.name} classes="font-medium mt-4">
  <div slot="content" class="w-full">
    {#if examples.length === 0}
      <div class="text-gray-400 mt-2">There is no example in this category.</div>
    {/if}
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
      {#each examples as example}
        <ExampleCard example={example} />
      {/each}
    </div>
  </div>
</Card>
