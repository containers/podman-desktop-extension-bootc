<script lang="ts">
export let title: string | undefined = undefined;
export let description: string | undefined = undefined;

export let href: string | undefined = undefined;
</script>

<a class="no-underline" href={href}>
  <div class="font-medium mt-4 rounded-md flex-nowrap overflow-hidden" role="region" aria-label={title ?? 'Card'}>
    <div class="flex flex-row">
      <div class="flex flex-row items-start">
        <div
          class="flex flex-col text-[var(--pd-content-card-text)] whitespace-normal space-y-2"
          aria-label="context-name">
          {#if title}
            <div>
              {title}
            </div>
          {/if}
          {#if description}
            <div>
              {description}
            </div>
          {/if}
        </div>
      </div>
    </div>
    <div class="flex overflow-hidden" role="region" aria-label="content">
      <slot name="content" />
    </div>
  </div>
</a>
