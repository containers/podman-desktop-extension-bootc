<script lang="ts">
import type { TinroRouteMeta } from 'tinro';
import { SettingsNavItem } from '@podman-desktop/ui-svelte';

export let meta: TinroRouteMeta;
</script>

<nav
  class="z-1 w-leftsidebar min-w-leftsidebar shadow flex-col justify-between flex bg-[var(--pd-secondary-nav-bg)] border-[var(--pd-global-nav-bg-border)] border-r-[1px]"
  aria-label="Navigation">
  <div class="flex items-center">
    <a href="/" title="Navigate to dashboard" class="pt-4 pl-3 px-5 mb-10 flex items-center ml-[4px]">
      <p class="text-xl font-semibold text-[color:var(--pd-secondary-nav-header-text)]">Bootable Containers</p>
    </a>
  </div>
  <div class="h-full overflow-hidden hover:overflow-y-auto" style="margin-bottom:auto">
    <SettingsNavItem title="Dashboard" selected={meta.url === '/'} href="/" />
    <SettingsNavItem title="Disk Images" selected={meta.url.startsWith('/disk-image')} href="/disk-images" />
  </div>
</nav>
