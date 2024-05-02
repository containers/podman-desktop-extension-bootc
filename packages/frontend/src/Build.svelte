<script lang="ts">
import './app.css';
import { faCheck, faCube, faQuestionCircle, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { bootcClient } from './api/client';
import FormPage from './lib/upstream/FormPage.svelte';
import Button from './lib/upstream/Button.svelte';
import type { BootcBuildInfo, BuildType } from '/@shared/src/models/bootc';
import Fa from 'svelte-fa';
import { onMount } from 'svelte';
import type { ImageInfo } from '@podman-desktop/api';
import { Input } from '@podman-desktop/ui-svelte';
import EmptyScreen from './lib/upstream/EmptyScreen.svelte';
import { router } from 'tinro';
import DiskImageIcon from './lib/DiskImageIcon.svelte';

export let imageName: string | undefined = undefined;
export let imageTag: string | undefined = undefined;

// Image variables
let selectedImage: string | undefined;
let existingBuild: boolean = false;

// Architecture variable
// This is an array as we will be support manifests
// the array contains the architectures (ex. arm64, amd64, etc.) of the image
// we will ONLY enable the architectures that are available in the image / manifest within the form.
// this is to prevent the user from selecting an architecture that is not available in the image.
// Will either be 'arm64' or 'amd64' as that is all we support for now.
let availableArchitectures: string[] = [];

// Build options
let buildFolder: string;
let buildType: BuildType[] = [];
let buildArch: string | undefined;
let buildFilesystem: string = ''; // Default filesystem auto-selected / empty
let overwrite: boolean = false;

// Other variable
let success = false;
let buildInProgress = false;
let bootcAvailableImages: ImageInfo[] = [];
let buildErrorMessage = '';
let errorFormValidation: string | undefined = undefined;

function findImage(repoTag: string): ImageInfo | undefined {
  return bootcAvailableImages.find(
    image => image.RepoTags && image.RepoTags.length > 0 && image.RepoTags[0] === repoTag,
  );
}
// Function that will use listHistoryInfo, if there is anything in the list, pick the first one in the list (as it's the most recent)
// and fill buildFolder, buildType and buildArch with the values from the selected image.
async function fillBuildOptions(historyInfo: BootcBuildInfo[] = []) {
  // Fill the build options from history
  if (historyInfo.length > 0) {
    const latestBuild = historyInfo[0];
    buildFolder = latestBuild.folder;
    buildType = latestBuild.type;
    buildArch = latestBuild.arch;
  }

  // If an image name and tag were passed in, try to use it as the initially selected image
  let initialImage: ImageInfo | undefined;
  if (imageName && imageTag) {
    initialImage = findImage(`${imageName}:${imageTag}`);
  }

  // If not, use the last image from history if it is valid
  if (!initialImage && historyInfo.length > 0 && historyInfo[0].image && historyInfo[0].tag) {
    // Find the image that matches the latest build's name and tag
    initialImage = findImage(`${historyInfo[0].image}:${historyInfo[0].tag}`);
  }

  if (initialImage && initialImage.RepoTags && initialImage.RepoTags.length > 0) {
    selectedImage = initialImage.RepoTags[0];
  }
}

async function fillArchitectures(historyInfo: BootcBuildInfo[]) {
  // If there is only one available architecture, select it automatically.
  if (availableArchitectures.length === 1) {
    buildArch = availableArchitectures[0];
    return;
  }

  // If none are propagated yet, go through the history, update available architectures and select the latest one
  if (selectedImage && historyInfo.length > 0) {
    const latestArch = historyInfo[0].arch;
    await updateAvailableArchitectures(selectedImage);
    // Only set buildArch if it's available in availableArchitectures
    if (latestArch && availableArchitectures.includes(latestArch)) {
      buildArch = latestArch;
    }
  }
}

async function validate() {
  let prereqs = await bootcClient.checkPrereqs();
  if (prereqs) {
    errorFormValidation = prereqs;
    existingBuild = false;
    return;
  }

  if (!selectedImage) {
    errorFormValidation = 'No image selected';
    existingBuild = false;
    return;
  }

  if (!buildFolder) {
    errorFormValidation = 'No output folder selected';
    existingBuild = false;
    return;
  }

  if (!buildType || buildType.length === 0) {
    errorFormValidation = 'Must select at least one disk image type';
    existingBuild = false;
    return;
  }

  if (!buildArch) {
    errorFormValidation = 'Architecture must be selected';
    existingBuild = false;
    return;
  }

  // overwrite
  existingBuild = await bootcClient.buildExists(buildFolder, buildType);
  if (existingBuild && !overwrite) {
    errorFormValidation = 'Confirm overwriting existing build';
    return;
  }

  // no problems, ready to build!
  errorFormValidation = undefined;
}

async function buildBootcImage() {
  // you can't get here without a selected image, but this
  // avoids a svelte error
  if (!selectedImage) {
    return;
  }

  // Before building a disk image name, we get a unique unused identifier for this image
  // This is to prevent the user from accidentally overwriting an history
  const buildImageName = selectedImage.split(':')[0];
  const buildID = await bootcClient.generateUniqueBuildID(buildImageName);

  // The build options
  const image = findImage(selectedImage);
  const buildOptions: BootcBuildInfo = {
    id: buildID,
    image: buildImageName,
    tag: selectedImage.split(':')[1],
    engineId: image?.engineId ?? '',
    folder: buildFolder,
    type: buildType,
    arch: buildArch,
    filesystem: buildFilesystem,
  };

  buildInProgress = true;
  try {
    // Do not await.. just start the build.
    // the reason being is that the validation / error logic happens in buildDiskImage
    // in the backend and it will error out there as that is where we can console.log
    // as well as notify the user of the error via showErrorMessage / showInformationMessage, etc.
    bootcClient.buildImage(buildOptions, overwrite);

    // Continue doing listHistoryInfo until the build container name, tag, type and arch show up
    // this means we can safely exit and see it in the dashboard as it's now in the history / running in the background.
    let timeout = 0;
    const timeoutLimit = 15; // Timeout after 15 seconds. This should be "instantaneous" to the API, but sometimes the API may be slow (reload of the page during `yarn watch`, machine freezes, etc.).

    // Continue until timeoutLimit is reached
    while (timeout < timeoutLimit) {
      const historyInfo = await bootcClient.listHistoryInfo();
      const found = historyInfo.find(info => info.id === buildID);

      if (found) {
        break; // Exit the loop if the build is found
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before the next check
      timeout++;
    }

    if (timeout === timeoutLimit) {
      throw new Error(
        'Timeout waiting trying to find the build in the history. Please check Podman Desktop console logs.',
      );
    }

    success = true;
  } catch (error) {
    success = false;
    buildErrorMessage = String(error);
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
  buildErrorMessage = '';
  errorFormValidation = '';
}

onMount(async () => {
  const imageInfos = await bootcClient.listBootcImages();

  // filter to images that have a repo tag here, to avoid doing it everywhere
  bootcAvailableImages = imageInfos.filter(image => image.RepoTags && image.RepoTags.length > 0);

  // Fills the build options with the last options
  const historyInfo = await bootcClient.listHistoryInfo();
  await fillBuildOptions(historyInfo);
  await fillArchitectures(historyInfo);

  validate();
});

/// Find the selected image and update availableArchitectures with the architecture of the image
async function updateAvailableArchitectures(selectedImage: string) {
  const image = findImage(selectedImage);
  if (image) {
    // If it is a manifest, we can just inspectManifest and get the architecture(s) from there
    if (image?.isManifest) {
      try {
        const manifest = await bootcClient.inspectManifest(image);
        // Go through each manifest.manifests and get the architecture from manifest.platform.architecture
        availableArchitectures = manifest.manifests.map(manifest => manifest.platform.architecture);
      } catch (error) {
        console.error('Error inspecting manifest:', error);
      }
    } else {
      try {
        const imageInspect = await bootcClient.inspectImage(image);
        // Architecture is a mandatory field in the image inspect and should **always** be there.
        if (imageInspect?.Architecture) {
          availableArchitectures = [imageInspect.Architecture];
        } else {
          // If for SOME reason Architecture is missing (testing purposes, weird output, etc.)
          // we will set availableArchitectures to an empty array to disable the architecture selection.
          availableArchitectures = [];
          console.error('Architecture not found in image inspect:', imageInspect);
        }
      } catch (error) {
        console.error('Error inspecting image:', error);
      }
    }
  }
}

// validate every time a selection changes in the form or available architectures
$: if (selectedImage || buildFolder || buildType || buildArch || overwrite) {
  validate();
}

// Each time an image is selected, we need to update the available architectures
// to do that, inspect the image and get the architecture.
$: if (selectedImage) {
  (async () => {
    await updateAvailableArchitectures(selectedImage);
  })();
}

$: if (availableArchitectures) {
  if (availableArchitectures.length === 1) {
    // If there is only ONE available architecture, select it automatically.
    buildArch = availableArchitectures[0];
  } else if (availableArchitectures.length > 1 && buildArch && !availableArchitectures.includes(buildArch)) {
    buildArch = undefined;
  } else if (availableArchitectures.length === 0) {
    // If none, disable buildArch selection regardless of what was selected before in history, etc.
    buildArch = undefined;
  }
}
</script>

<FormPage title="Build Disk Image" inProgress="{buildInProgress}" showBreadcrumb="{true}">
  <DiskImageIcon slot="icon" size="30px" />

  <div slot="content" class="p-5 min-w-full h-fit">
    {#if success}
      <EmptyScreen
        icon="{DiskImageIcon}"
        title="Build task started"
        message="Check your progress by viewing the build container, or clicking the tasks button in the bottom right corner of Podman Desktop.">
        <Button
          class="py-3"
          on:click="{() => {
            cleanup();
            router.goto('/');
          }}">
          Go back
        </Button>
      </EmptyScreen>
    {:else if buildErrorMessage}
      <EmptyScreen icon="{faTriangleExclamation}" title="Error with image build" message="{buildErrorMessage}">
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
            <label for="modalImageTag" class="block mb-2 text-md font-semibold">Bootable container image</label>
            <div class="relative">
              <!-- Container with relative positioning -->
              <select
                class="text-sm rounded-lg block w-full p-2.5 bg-charcoal-600 pl-8 border-r-8 border-transparent outline-1 outline outline-gray-900 placeholder-gray-700 text-white"
                name="imageChoice"
                aria-label="image-select"
                bind:value="{selectedImage}">
                <!-- Options go here -->
                {#if !selectedImage}
                  <option value="" disabled selected>Select an image</option>
                {/if}
                {#if bootcAvailableImages.length > 0}
                  {#each bootcAvailableImages as image}
                    <!-- Repo tags is an array, only show if it is > 0 and show the first one -->
                    {#if image.RepoTags && image.RepoTags.length > 0}
                      <option value="{image.RepoTags[0]}">{image.RepoTags[0]}</option>
                    {/if}
                  {/each}
                {/if}
              </select>
              <!-- Position icon absolutely within the relative container -->
              {#if bootcAvailableImages.length === 0}
                <Fa class="absolute left-0 top-0 ml-2 mt-3 text-amber-500" size="1x" icon="{faTriangleExclamation}" />
              {:else if selectedImage}
                <Fa class="absolute left-0 top-0 ml-2 mt-3 text-green-300" size="1x" icon="{faCube}" />
              {:else}
                <Fa class="absolute left-0 top-0 ml-2 mt-3 text-gray-500" size="1x" icon="{faQuestionCircle}" />
              {/if}
            </div>
            {#if bootcAvailableImages.length === 0}
              <p class="text-amber-500 text-sm pt-1">
                No bootable container compatible images found. Learn to create one on our <a
                  class="text-purple-400 hover:bg-white hover:bg-opacity-10 transition-all rounded-[4px] p-0.5 no-underline cursor-pointer"
                  href="https://github.com/containers/podman-desktop-extension-bootc">README</a
                >.
              </p>
            {/if}
          </div>
          <div>
            <label for="path" class="block mb-2 text-md font-semibold">Output folder</label>
            <div class="flex flex-row space-x-3">
              <Input
                name="path"
                id="path"
                bind:value="{buildFolder}"
                placeholder="Output folder"
                class="w-full"
                aria-label="folder-select" />
              <Button on:click="{() => getPath()}">Browse...</Button>
            </div>
          </div>
          <div class="pt-3 space-y-3 h-fit">
            <div class="mb-2">
              <span class="text-md font-semibold mb-2 block">Disk image type</span>
              <div class="flex items-center mb-3">
                <label for="raw" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildType}"
                    type="checkbox"
                    id="raw"
                    name="format"
                    value="raw"
                    class="sr-only peer"
                    aria-label="raw-select" />
                  <div
                    class="w-4 h-4 rounded-sm border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                    {#if buildType.includes('raw')}
                      <Fa class="text-charcoal-900 absolute p-0.5" size="0.9x" icon="{faCheck}" />
                    {/if}
                  </div>
                  <span class="text-sm text-white">RAW image with partition table (*.raw)</span>
                </label>
              </div>
              <div class="flex items-center mb-3">
                <label for="qcow2" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildType}"
                    type="checkbox"
                    id="qcow2"
                    name="format"
                    value="qcow2"
                    class="sr-only peer"
                    aria-label="qcow2-select" />
                  <div
                    class="w-4 h-4 rounded-sm border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                    {#if buildType.includes('qcow2')}
                      <Fa class="text-charcoal-900 absolute p-0.5" size="0.9x" icon="{faCheck}" />
                    {/if}
                  </div>
                  <span class="text-sm text-white">Virtualization Guest Image (*.qcow2)</span>
                </label>
              </div>
              <div class="flex items-center mb-3">
                <label for="iso" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildType}"
                    type="checkbox"
                    id="iso"
                    name="format"
                    value="iso"
                    class="sr-only peer"
                    aria-label="iso-select" />
                  <div
                    class="w-4 h-4 rounded-sm border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                    {#if buildType.includes('iso')}
                      <Fa class="text-charcoal-900 absolute p-0.5" size="0.9x" icon="{faCheck}" />
                    {/if}
                  </div>
                  <span class="text-sm text-white">Unattended Baremetal Installer (*.iso)</span>
                </label>
              </div>
              <div class="flex items-center mb-3">
                <label for="vmdk" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildType}"
                    type="checkbox"
                    id="vmdk"
                    name="format"
                    value="vmdk"
                    class="sr-only peer"
                    aria-label="vmdk-select" />
                  <div
                    class="w-4 h-4 rounded-sm border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                    {#if buildType.includes('vmdk')}
                      <Fa class="text-charcoal-900 absolute p-0.5" size="0.9x" icon="{faCheck}" />
                    {/if}
                  </div>
                  <span class="text-sm text-white">Virtual Machine Disk image (*.vmdk)</span>
                </label>
              </div>
              <div class="flex items-center mb-3">
                <label for="ami" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildType}"
                    type="checkbox"
                    id="ami"
                    name="format"
                    value="ami"
                    class="sr-only peer"
                    aria-label="ami-select" />
                  <div
                    class="w-4 h-4 rounded-sm border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                    {#if buildType.includes('ami')}
                      <Fa class="text-charcoal-900 absolute p-0.5" size="0.9x" icon="{faCheck}" />
                    {/if}
                  </div>
                  <span class="text-sm text-white">Amazon Machine Image (*.ami)</span>
                </label>
              </div>
            </div>
            <div>
              <span class="text-md font-semibold mb-2 block">Filesystem</span>
              <div class="flex items-center mb-3 space-x-3">
                <label for="defaultFs" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildFilesystem}"
                    type="radio"
                    id="defaultFs"
                    name="filesystem"
                    value=""
                    class="sr-only peer"
                    aria-label="default-filesystem-select" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                  </div>
                  <span class="text-sm text-white">Default</span>
                </label>
                <label for="xfsFs" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildFilesystem}"
                    type="radio"
                    id="xfsFs"
                    name="filesystem"
                    value="xfs"
                    class="sr-only peer"
                    aria-label="xfs-filesystem-select" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                  </div>
                  <span class="text-sm text-white">XFS</span>
                </label>
                <label for="ext4Fs" class="ml-1 flex items-center cursor-pointer">
                  <input
                    bind:group="{buildFilesystem}"
                    type="radio"
                    id="ext4Fs"
                    name="filesystem"
                    value="ext4"
                    class="sr-only peer"
                    aria-label="ext4-filesystem-select" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
                  </div>
                  <span class="text-sm text-white">EXT4</span>
                </label>
              </div>
              <p class="text-gray-300 text-xs">
                Note: The default filesystem is automatically detected based on the base container image. However, some
                images such as Fedora may require a specific filesystem to be selected.
              </p>
            </div>
            <div class="mb-2">
              <span class="text-md font-semibold mb-2 block">Platform</span>
              <ul class="grid grid-cols-2 gap-x-2 max-w-md">
                <li>
                  <input
                    bind:group="{buildArch}"
                    type="radio"
                    id="arm64"
                    name="arch"
                    value="arm64"
                    class="sr-only peer"
                    aria-label="arm64-select"
                    disabled="{!availableArchitectures.includes('arm64')}" />
                  <label
                    for="arm64"
                    class="h-full flex items-center p-5 cursor-pointer rounded-lg bg-zinc-700 border border-transparent focus:outline-none peer-checked:ring-2 peer-checked:ring-violet-500 peer-checked:border-transparent {availableArchitectures.includes(
                      'arm64',
                    )
                      ? 'cursor-pointer hover:border-violet-500'
                      : 'ring-0 opacity-50'}">
                    <i class="fab fa-linux fa-2x"></i>
                    <br />
                    <span class="ml-2 text-sm">ARM® aarch64 systems</span>
                  </label>
                </li>
                <li>
                  <input
                    bind:group="{buildArch}"
                    type="radio"
                    id="amd64"
                    name="arch"
                    value="amd64"
                    class="sr-only peer"
                    aria-label="amd64-select"
                    disabled="{!availableArchitectures.includes('amd64')}" />
                  <label
                    for="amd64"
                    class="h-full flex items-center p-5 cursor-pointer rounded-lg bg-zinc-700 border border-transparent focus:outline-none peer-checked:ring-2 peer-checked:ring-violet-500 peer-checked:border-transparent {availableArchitectures.includes(
                      'amd64',
                    )
                      ? 'cursor-pointer hover:border-violet-500'
                      : 'ring-0 opacity-50'}">
                    <i class="fab fa-linux fa-2x"></i>
                    <br />
                    <span class="ml-2 text-sm">Intel and AMD x86_64 systems</span>
                  </label>
                </li>
              </ul>
              <p class="text-gray-300 text-xs pt-1">
                Note: Disk image architecture must match the architecture of the original image. For example, you must
                have an ARM container image to build an ARM disk image. You can only select the architecture that is
                detectable within the image or manifest.
              </p>
            </div>
          </div>
        </div>
        {#if existingBuild}
          <label for="overwrite" class="ml-1 flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="overwrite"
              name="overwrite"
              class="sr-only peer"
              aria-label="overwrite-select"
              bind:checked="{overwrite}" />
            <div
              class="w-4 h-4 rounded-sm border-2 border-gray-400 mr-2 peer-checked:border-purple-500 peer-checked:bg-purple-500">
            </div>
            <span class="text-sm text-white">Overwrite existing build</span>
          </label>
        {/if}
        {#if errorFormValidation}
          <div aria-label="validation" class="bg-red-800 p-3 rounded-md text-white text-sm">{errorFormValidation}</div>
        {/if}
        {#if buildInProgress}
          <Button class="w-full" disabled="{true}">Creating build task</Button>
        {:else}
          <Button on:click="{() => buildBootcImage()}" disabled="{errorFormValidation != undefined}" class="w-full"
            >Build</Button>
        {/if}
      </div>
    {/if}
  </div></FormPage>
