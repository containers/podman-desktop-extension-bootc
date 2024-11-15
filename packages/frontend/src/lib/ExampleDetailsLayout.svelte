<script lang="ts">
export let detailsTitle: string;
export let detailsLabel: string;
let open: boolean = true;

const toggle = (): void => {
  open = !open;
};
</script>

<div class="flex flex-col w-full overflow-y-auto">
  <slot name="header" />
  <div class="grid w-full lg:grid-cols-[1fr_auto] max-lg:grid-cols-[auto]">
    <div class="p-5 inline-grid">
      <slot name="content" />
    </div>
    <div class="inline-grid max-lg:order-first">
      <div class="max-lg:w-full max-lg:min-w-full" class:w-[375px]={open} class:min-w-[375px]={open}>
        <div
          class:hidden={!open}
          class:block={open}
          class="h-fit lg:bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-title)] lg:rounded-l-md lg:mt-5 lg:py-4 max-lg:block"
          aria-label={`${detailsLabel} panel`}>
          <div class="flex flex-col lg:px-4 space-y-4 mx-auto">
            <div class="w-full flex flex-row justify-between max-lg:hidden">
              <span>{detailsTitle}</span>
              <button on:click={toggle} aria-label={`hide ${detailsLabel}`}
                ><i class="fas fa-angle-right text-[var(--pd-content-card-icon)]"></i></button>
            </div>
            <slot name="details" />
          </div>
        </div>
        <div
          class:hidden={open}
          class:block={!open}
          class="bg-[var(--pd-content-card-bg)] mt-5 p-4 rounded-md h-fit max-lg:hidden"
          aria-label={`toggle ${detailsLabel}`}>
          <button on:click={toggle} aria-label={`show ${detailsLabel}`}
            ><i class="fas fa-angle-left text-[var(--pd-content-card-icon)]"></i></button>
        </div>
      </div>
    </div>
  </div>
</div>
