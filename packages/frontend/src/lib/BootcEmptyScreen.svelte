<script lang="ts">
import BootcSelkie from './BootcSelkie.svelte';
import Link from './Link.svelte';
import { faArrowCircleDown, faCube } from '@fortawesome/free-solid-svg-icons';
import { onMount, tick } from 'svelte';
import { bootcClient, rpcBrowser } from '../api/client';
import { Messages } from '/@shared/src/messages/Messages';
import { router } from 'tinro';
import { Button } from '@podman-desktop/ui-svelte';

let pullInProgress = false;
let imageExists = false;
let displayDisclaimer = false;
let bootcAvailableImages: any[] = [];

const exampleImage = 'quay.io/bootc-extension/httpd:latest';
const bootcImageBuilderSite = 'https://github.com/osbuild/bootc-image-builder';
const bootcSite = 'https://containers.github.io/bootc/';
const centosBootcSite = 'https://github.com/CentOS/centos-bootc';
const extensionSite = 'https://github.com/containers/podman-desktop-extension-bootc';

async function gotoBuild(): Promise<void> {
  // Split the image name to get the image name and tag
  // and go to /build/:image/:tag
  // this will pre-select the image and tag in the build screen
  const [image, tag] = exampleImage.split(':');
  router.goto(`/build/${encodeURIComponent(image)}/${encodeURIComponent(tag)}`);
}

async function pullExampleImage() {
  pullInProgress = true;
  displayDisclaimer = false;
  bootcClient.pullImage(exampleImage);

  // After 5 seconds, check if pull is still in progress and display disclaimer if true
  setTimeout(async () => {
    if (pullInProgress) {
      displayDisclaimer = true;
      await tick(); // Ensure UI updates to reflect the new state
    }
  }, 5000);
}

onMount(async () => {
  bootcAvailableImages = await bootcClient.listBootcImages();

  return rpcBrowser.subscribe(Messages.MSG_IMAGE_PULL_UPDATE, async msg => {
    if (msg.image === exampleImage) {
      pullInProgress = !msg.success;
      if (!pullInProgress) {
        displayDisclaimer = false; // Ensure disclaimer is removed when not in progress
      }
    }
    // Update the list of available images after a successful pull
    if (msg.success) {
      bootcAvailableImages = await bootcClient.listBootcImages();
    }
  });
});

// Each time bootcAvailableImages updates, check if 'quay.io/bootc-extension/httpd' is in RepoTags
$: {
  if (bootcAvailableImages && bootcAvailableImages.some(image => image.RepoTags.includes(exampleImage))) {
    imageExists = true;
  }
}
</script>

<div class="flex w-full h-full justify-center items-center">
  <div class="flex flex-col h-full items-center text-center space-y-3">
    <!-- Bootable Container Icon -->
    <div class="text-gray-700 py-2">
      <svelte:component this="{BootcSelkie}" size="120" />
    </div>

    <h1 class="text-xl pb-4">Welcome to Bootable Containers</h1>

    <p class="text-gray-700 pb-4 max-w-xl">
      Bootable Containers builds an entire bootable OS from your container image. Utilizing the technology of a
      <Link externalRef="{centosBootcSite}">compatible image</Link>, <Link externalRef="{bootcImageBuilderSite}"
        >bootc-image-builder</Link
      >, and <Link externalRef="{bootcSite}">bootc</Link>, your container image is transformed into a bootable disk
      image.
    </p>

    <p class="text-gray-700 pb-1 max-w-xl">
      Create your first disk image by {imageExists ? 'building' : 'pulling'} the <Link
        externalRef="{`https://${exampleImage}`}">example container image</Link
      >:
    </p>

    <!-- Build / pull buttons -->
    {#if imageExists}
      <Button on:click="{() => gotoBuild()}" icon="{faCube}" aria-label="Build image" title="Build"
        >Build {exampleImage}</Button>
    {:else}
      <Button
        on:click="{() => pullExampleImage()}"
        icon="{faArrowCircleDown}"
        inProgress="{pullInProgress}"
        aria-label="Pull image"
        title="Pull image">Pull {exampleImage}</Button>
    {/if}
    {#if displayDisclaimer}
      <p class="text-amber-500 text-xs">The file size of the image is over 1.5GB and may take a while to download.</p>
    {/if}

    <p class="text-gray-700 pt-8 max-w-xl">
      Want to learn more including building your own Containerfile? Check out the <Link externalRef="{extensionSite}"
        >extension documentation</Link
      >.
    </p>
  </div>
</div>
