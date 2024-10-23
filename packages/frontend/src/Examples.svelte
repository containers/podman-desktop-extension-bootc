<script lang="ts">
import type { Example, Category } from '/@shared/src/models/examples';
import { onMount } from 'svelte';
import { NavPage } from '@podman-desktop/ui-svelte';
import { bootcClient } from './api/client';
import ExamplesCard from './lib/ExamplesCard.svelte';

let groups: Map<Category, Example[]> = new Map();

const UNCLASSIFIED: Category = {
  id: 'unclassified',
  name: 'Unclassified',
};

onMount(async () => {
  // onmount get the examples
  let examples = await bootcClient.getExamples();

  const categoryDict = Object.fromEntries(examples.categories.map((category: { id: any }) => [category.id, category]));

  const output: Map<Category, Example[]> = new Map();

  for (const example of examples.examples) {
    if (example.categories.length === 0) {
      output.set(UNCLASSIFIED, [...(output.get(UNCLASSIFIED) ?? []), example]);
      continue;
    }

    // iterate over all categories
    for (const categoryId of example.categories) {
      let key: Category;
      if (categoryId in categoryDict) {
        key = categoryDict[categoryId];
      } else {
        key = UNCLASSIFIED;
      }

      output.set(key, [...(output.get(key) ?? []), example]);
    }
  }

  groups = output;
});
</script>

<NavPage title="Examples" searchEnabled={false}>
  <div slot="content" class="flex flex-col min-w-full min-h-full">
    <div class="min-w-full min-h-full flex-1">
      <div class="px-5 space-y-5">
        {#each groups.entries() as [category, examples]}
          <ExamplesCard category={category} examples={examples} />
        {/each}
      </div>
    </div>
  </div>
</NavPage>
