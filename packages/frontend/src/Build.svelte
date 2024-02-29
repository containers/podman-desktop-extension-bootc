<script lang="ts">
import './app.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { faCube, faQuestionCircle, faRocket, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { bootcClient } from './api/client';
import FormPage from './lib/upstream/FormPage.svelte';
import Input from './lib/upstream/Input.svelte';
import Button from './lib/upstream/Button.svelte';
import type { BootcBuildOptions } from '@shared/src/models/bootc';
import Fa from 'svelte-fa';
import { onMount } from 'svelte';
import type { ImageInfo } from '@podman-desktop/api';
import EmptyScreen from './lib/upstream/EmptyScreen.svelte';
import { router } from 'tinro';

// Image variables
let selectedImage: ImageInfo;
let buildImageName: string;
let buildTag: string;
let buildEngineId: string;

// Build options
let buildFolder: string;
let buildType: string;
let buildArch: string;

// Other variables
let success = false;
let buildInProgress = false;
let bootcAvailableImages: any[] = [];
let errorMessage = '';
let errorFormValidation = '';

// Function that will use listHistoryInfo, if there is anything in the list, pick the first one in the list (as it's the most recent)
// and fill buildFolder, buildType and buildArch with the values from the selected image.
async function fillBuildOptions() {
  const historyInfo = await bootcClient.listHistoryInfo();
  if (historyInfo.length > 0) {
    const latestBuild = historyInfo[0];
    buildFolder = latestBuild.location;
    buildType = latestBuild.type;
    buildArch = latestBuild.arch;

    // Go through bootcAvailableImages and find the one that matches latestBuild.image and latestBuild.tag
    // and set selectedImage to that value.
    for (const image of bootcAvailableImages) {
      if (image.RepoTags && image.RepoTags.length > 0) {
        if (image.RepoTags[0] === `${latestBuild.image}:${latestBuild.tag}`) {
          selectedImage = image;
          break;
        }
      }
    }
  }
}

async function buildBootcImage() {
  // Before ANYTHING validate / check all values before submitting:
  // Reset the form validation error message
  errorFormValidation = '';
  let missingFields = [];
  if (!buildImageName) missingFields.push('image name');
  if (!buildTag) missingFields.push('tag');
  if (!buildEngineId) missingFields.push('engine ID');
  if (!buildFolder) missingFields.push('build folder');
  if (!buildType) missingFields.push('build type');
  if (!buildArch) missingFields.push('architecture');
  if (missingFields.length > 0) {
    errorFormValidation = `Missing fields: ${missingFields.join(', ')}`;
    return; // Stop execution if any field is missing
  }

  // TODO: Add check to see if folder is empty or not, if it is, show a warning message to the user

  // The build options
  const buildOptions: BootcBuildOptions = {
    name: buildImageName,
    tag: buildTag,
    engineId: buildEngineId,
    folder: buildFolder,
    type: buildType,
    arch: buildArch,
  };
  buildInProgress = true;
  try {
    // Do not await.. just start the build.
    // the reason being is that the validation / error logic happens in buildDiskImage
    // in the backend and it will error out there as that is where we can console.log
    // as well as notify the user of the error via showErrorMessage / showInformationMessage, etc.
    bootcClient.buildImage(buildOptions);

    // Continue doing listHistoryInfo until the build container name, tag, type and arch show up
    // this means we can safely exit and see it in the dashboard as it's now in the history / running in the background.
    let timeout = 0;
    const timeoutLimit = 10; // Timeout after 10 seconds

    while (timeout < timeoutLimit) {
      const historyInfo = await bootcClient.listHistoryInfo();
      const found = historyInfo.find(
        info =>
          info.image === buildImageName && info.tag === buildTag && info.type === buildType && info.arch === buildArch,
      );

      if (found) {
        break; // Exit the loop if the build is found
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before the next check
      timeout++;
    }

    if (timeout === timeoutLimit) {
      throw new Error('Timeout waiting for build to start');
    }

    success = true;
  } catch (error) {
    success = false;
    errorMessage = String(error);
  } finally {
    buildInProgress = false;
  }
}

async function getPath() {
  buildFolder = await bootcClient.selectOutputFolder();
}

function cleanup() {
  success = false;
  buildInProgress = false;
  errorMessage = '';
  errorFormValidation = '';
}

onMount(async () => {
  bootcAvailableImages = await bootcClient.listBootcImages();

  // Fills the build options with the last options
  await fillBuildOptions();
});

// each time imageName updated, "split" it between : to image and tag
$: {
  if (selectedImage !== undefined) {
    if (selectedImage.RepoTags && selectedImage.RepoTags.length > 0) {
      buildImageName = selectedImage.RepoTags[0].split(':')[0];
      buildTag = selectedImage.RepoTags[0].split(':')[1];
      buildEngineId = selectedImage.engineId;
    }
  }
}
</script>

<FormPage title="BootC Image Builder" inProgress="{buildInProgress}" showBreadcrumb="{true}">
  <svelte:fragment slot="icon">
    <i class="fas fa-rocket fa-2x" aria-hidden="true"></i>
  </svelte:fragment>

  <div slot="content" class="p-5 min-w-full h-fit">
    {#if success}
      <EmptyScreen
        icon="{faRocket}"
        title="Started BootC image build"
        message="You can now go back while the build is being created in the background">
        <Button
          class="py-3"
          on:click="{() => {
            cleanup();
            router.goto('/');
          }}">
          Go back to dashboard
        </Button>
      </EmptyScreen>
    {:else if errorMessage}
      <EmptyScreen icon="{faTriangleExclamation}" title="Error with bootc image build" message="{errorMessage}">
        <Button
          class="py-3"
          on:click="{() => {
            cleanup();
            router.goto('/');
          }}">
          Go back
        </Button>
      </EmptyScreen>
    {:else}
      <div class="bg-charcoal-900 pt-5 space-y-6 px-8 sm:pb-6 xl:pb-8 rounded-lg">
        <div class="{buildInProgress ? 'opacity-40 pointer-events-none' : ''}">
          <div class="pb-4">
            <label for="modalImageTag" class="block mb-2 text-sm font-medium text-gray-400">Image tag</label>
            <div class="relative">
              <!-- Container with relative positioning -->
              <select
                class="text-sm rounded-lg block w-full p-2.5 bg-charcoal-600 pl-8 border-r-8 border-transparent outline-1 outline outline-gray-900 placeholder-gray-700 text-white"
                name="imageChoice"
                bind:value="{selectedImage}">
                <!-- Options go here -->
                {#if bootcAvailableImages.length > 0}
                  <option value="">Select an image</option>
                  {#each bootcAvailableImages as image}
                    <!-- Repo tags is an array, only show if it is > 0 and show the first one -->
                    {#if image.RepoTags && image.RepoTags.length > 0}
                      <option value="{image}">{image.RepoTags[0]}</option>
                    {/if}
                  {/each}
                {:else}
                  <option value="">No bootc compatible images found</option>
                {/if}
              </select>
              <!-- Position icon absolutely within the relative container -->
              {#if bootcAvailableImages.length === 0}
                <Fa class="absolute left-0 top-0 ml-2 mt-3 text-amber-500" size="16" icon="{faTriangleExclamation}" />
              {:else if buildImageName}
                <Fa class="absolute left-0 top-0 ml-2 mt-3 text-green-300" size="16" icon="{faCube}" />
              {:else}
                <Fa class="absolute left-0 top-0 ml-2 mt-3 text-gray-500" size="16" icon="{faQuestionCircle}" />
              {/if}
            </div>
            {#if bootcAvailableImages.length === 0}
              <p class="text-amber-500 text-sm pt-1">
                No bootc compatible images found. Learn to create one on our <a
                  class="text-purple-400 hover:bg-white hover:bg-opacity-10 transition-all rounded-[4px] p-0.5 no-underline cursor-pointer"
                  href="https://github.com/containers/podman-desktop-extension-bootc">README</a
                >.
              </p>
            {/if}
            <p class="text-gray-300 text-xs pt-1">
              Note: All images must be pushed to a publically accessible registry in order for our build system to
              "pull" the images. This will be fixed in the future.
            </p>
          </div>
          <div>
            <label for="path" class="block mb-2 text-sm font-bold text-gray-400">Build output folder</label>
            <div class="flex flex-row space-x-3">
              <Input name="path" id="path" bind:value="{buildFolder}" placeholder="Output folder" class="w-full" />
              <Button on:click="{() => getPath()}">Browse...</Button>
            </div>
          </div>
          <div class="pt-3 space-y-7 h-fit">
            <div class="mb-2">
              <span class="text-md font-semibold mb-2 block">Image type</span>
              <div class="flex items-center mb-3">
                <label for="raw" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildType}"
                    type="radio"
                    id="raw"
                    name="format"
                    value="raw"
                    class="sr-only peer" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                  </div>
                  <span class="text-sm text-white">RAW image with partition table (*.raw)</span>
                </label>
              </div>
              <div class="flex items-center mb-3">
                <label for="qcow2" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildType}"
                    type="radio"
                    id="qcow2"
                    name="format"
                    value="qcow2"
                    class="sr-only peer" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                  </div>
                  <span class="text-sm text-white">Virtualization Guest Image (*.qcow2)</span>
                </label>
              </div>
              <div class="flex items-center mb-3">
                <label for="iso" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildType}"
                    type="radio"
                    id="iso"
                    name="format"
                    value="iso"
                    class="sr-only peer" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                  </div>
                  <span class="text-sm text-white">Unattended Baremetal Installer (*.iso)</span>
                </label>
              </div>
              <div class="flex items-center mb-3">
                <label for="ami" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildType}"
                    type="radio"
                    id="ami"
                    name="format"
                    value="ami"
                    class="sr-only peer" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                  </div>
                  <span class="text-sm text-white">Amazon Machine Image (*.ami)</span>
                </label>
              </div>
            </div>
            <div class="mb-2">
              <span class="text-md font-semibold mb-2 block">Architecture</span>
              <ul class="grid grid-cols-2 gap-x-2 max-w-md">
                <li>
                  <input
                    bind:group="{buildArch}"
                    type="radio"
                    id="amd64"
                    name="arch"
                    value="amd64"
                    class="sr-only peer" />
                  <label
                    for="amd64"
                    class="h-full flex items-center p-5 cursor-pointer rounded-lg bg-zinc-700 border border-transparent hover:border-violet-500 focus:outline-none peer-checked:ring-2 peer-checked:ring-violet-500 peer-checked:border-transparent">
                    <i class="fab fa-linux fa-2x"></i>
                    <br />
                    <span class="ml-2 text-sm">Intel and AMD x86_64 systems</span>
                  </label>
                </li>
                <li>
                  <input
                    bind:group="{buildArch}"
                    type="radio"
                    id="arm64"
                    name="arch"
                    value="arm64"
                    class="sr-only peer" />
                  <label
                    for="arm64"
                    class="h-full flex items-center p-5 cursor-pointer rounded-lg bg-zinc-700 border border-transparent hover:border-violet-500 focus:outline-none peer-checked:ring-2 peer-checked:ring-violet-500 peer-checked:border-transparent">
                    <i class="fab fa-linux fa-2x"></i>
                    <br />
                    <span class="ml-2 text-sm">ARM® aarch64 systems</span>
                  </label>
                </li>
              </ul>
              <p class="text-gray-300 text-xs pt-1">
                Note: Architecture being built must match the architecture of the selected image. For example, you must
                have an ARM container image to build an ARM disk image.
              </p>
            </div>
          </div>
        </div>
        {#if errorFormValidation}
          <div class="bg-red-600 p-3 rounded-md text-white text-sm">{errorFormValidation}</div>
        {/if}
        {#if buildInProgress}
          <Button class="w-full" disabled="{true}">Creating Bootc build container</Button>
        {:else}
          <Button on:click="{() => buildBootcImage()}" class="w-full">Build</Button>
        {/if}
      </div>
    {/if}
  </div></FormPage>
