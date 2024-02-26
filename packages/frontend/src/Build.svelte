<script lang="ts">
import './app.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { faCube, faCubes, faQuestionCircle, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { bootcClient } from './api/client';
import FormPage from './lib/FormPage.svelte';
import Input from './lib/Input.svelte';
import Button from './lib/Button.svelte';
import type { BootcBuildOptions } from '@shared/src/models/build';
import Fa from 'svelte-fa';
import { onMount } from 'svelte';
import type { ImageInfo } from '@podman-desktop/api';
import EmptyScreen from './lib/EmptyScreen.svelte';
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

async function buildBootcImage() {
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
    await bootcClient.buildImage(buildOptions);
    success = true;
  } catch (error) {
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
}

onMount(async () => {
  bootcAvailableImages = await bootcClient.listBootcImages();
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

<FormPage title="Bootc Image Builder" inProgress="{buildInProgress}" showBreadcrumb="{false}">
  <svelte:fragment slot="icon">
    <i class="fas fa-cube fa-2x" aria-hidden="true"></i>
  </svelte:fragment>

  <div slot="content" class="p-5 min-w-full h-fit">
    {#if success}
      <EmptyScreen icon="{faCubes}" title="Started bootc image build" message="Started bootc image build">
        <Button
          class="py-3"
          on:click="{() => {
            cleanup();
            router.goto('/');
          }}">
          Go back
        </Button>
      </EmptyScreen>
    {:else if errorMessage}
      <EmptyScreen icon="{faCubes}" title="Error with bootc image build" message="{errorMessage}">
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
            {#if bootcAvailableImages.length === 0}
              <Fa class="absolute mt-3 ml-1.5 text-amber-500" size="16" icon="{faTriangleExclamation}" />
            {:else if buildImageName}
              <Fa class="absolute mt-3 ml-1.5 text-green-300" size="16" icon="{faCube}" />
            {:else}
              <Fa class="absolute mt-3 ml-1.5 text-gray-500" size="16" icon="{faQuestionCircle}" />
            {/if}
            <select
              class="text-sm rounded-lg block w-full p-2.5 bg-charcoal-600 pl-6 border-r-8 border-transparent outline-1 outline outline-gray-900 placeholder-gray-700 text-white"
              name="imageChoice"
              bind:value="{selectedImage}">
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
            {#if bootcAvailableImages.length === 0}
              <p class="text-amber-500 text-sm pt-1">
                No bootc compatible images found. Learn to create one on our <a
                  class="text-purple-400 hover:bg-white hover:bg-opacity-10 transition-all rounded-[4px] p-0.5 no-underline cursor-pointer"
                  href="https://github.com/containers/podman-desktop-extension-bootc">README</a
                >.
              </p>
            {/if}
          </div>
          <div>
            <label for="path" class="block mb-2 text-sm font-bold text-gray-400">Build output folder</label>
            <div class="flex flex-row space-x-3">
              <Input name="path" id="path" bind:value="{buildFolder}" placeholder="Output folder" class="w-full" />
              <Button on:click="{() => getPath()}">Browse...</Button>
            </div>
          </div>
          <div class="p-2 space-y-7 h-fit">
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
            </div>
          </div>
        </div>
        {#if buildInProgress}
          <Button class="w-full" disabled="{true}"
            >Building bootc image in the background. You may safely close this window.</Button>
        {:else}
          <Button on:click="{() => buildBootcImage()}" class="w-full">Build</Button>
        {/if}
      </div>
    {/if}
  </div></FormPage>
