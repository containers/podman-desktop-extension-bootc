<script lang="ts">
import './app.css';
import {
  faCaretDown,
  faCaretRight,
  faCube,
  faQuestionCircle,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { bootcClient } from './api/client';
import type { BootcBuildInfo, BuildType } from '/@shared/src/models/bootc';
import Fa from 'svelte-fa';
import { onMount } from 'svelte';
import type { ImageInfo, ManifestInspectInfo } from '@podman-desktop/api';
import { router } from 'tinro';
import DiskImageIcon from './lib/DiskImageIcon.svelte';
import { Button, Input, EmptyScreen, FormPage, Checkbox, ErrorMessage } from '@podman-desktop/ui-svelte';
import Link from './lib/Link.svelte';

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
let buildConfigFile: string;
let buildChown: string;
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

// Specific to root filesystem selection
// SPECIFICALLY fedora, where we **need** to select the filesystem, as it is not auto-selected.
// this boolean will be set to true if the selected image is Fedora and shown as a warning to the user.
let fedoraDetected = false;
let isLinux: boolean;

// AWS Related
let awsAmiName: string = '';
let awsBucket: string = '';
let awsRegion: string = '';

// Show/hide advanced options
let showAdvanced = false; // State to show/hide advanced options
function toggleAdvanced() {
  showAdvanced = !showAdvanced;
}

function findImage(repoTag: string): ImageInfo | undefined {
  return bootcAvailableImages.find(
    image => image.RepoTags && image.RepoTags.length > 0 && image.RepoTags[0] === repoTag,
  );
}

// Find images associated to the manifest
// optionally, filter by the archiecture.
async function findImagesAssociatedToManifest(manifest: ManifestInspectInfo): Promise<ImageInfo[]> {
  const images = await bootcClient.listAllImages();
  return images.filter(image => {
    return manifest.manifests.some(manifest => image.Digest.includes(manifest.digest));
  });
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

// This will fill the chown function by getting the user and group ID from the OS
// and filling in the information in the chown input field.
async function fillChownOption() {
  try {
    const gidUid = await bootcClient.getUidGid();
    buildChown = gidUid;
  } catch (error) {
    console.error('Error getting UID and GID:', error);
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

  // If anaconda-iso was selected and the buildType length is more than 1, we error saying that iso must be the only type selected.
  if (buildType.length > 1 && buildType.includes('anaconda-iso')) {
    errorFormValidation = 'The Anaconda ISO file format cannot be built simultaneously with other image types.';
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
    imageId: image?.Id ?? '',
    tag: selectedImage.split(':')[1],
    engineId: image?.engineId ?? '',
    folder: buildFolder,
    buildConfigFilePath: buildConfigFile,
    type: buildType,
    arch: buildArch,
    filesystem: buildFilesystem,
    chown: buildChown,
    awsAmiName: awsAmiName,
    awsBucket: awsBucket,
    awsRegion: awsRegion,
  };

  // If manifest is detected, we will instead use the child image ID, as that is the correct one associated to the selection. This is needed
  // for Linux support as we are transfering the image to the root podman connection and an ID is needed.
  if (image?.isManifest) {
    try {
      const manifest = await bootcClient.inspectManifest(image);
      const foundImages = await findImagesAssociatedToManifest(manifest);

      // Inspect each image and find the image that matches the buildArch
      for (const foundImage of foundImages) {
        const inspectedImage = await bootcClient.inspectImage(foundImage);
        if (inspectedImage.Architecture === buildArch) {
          buildOptions.imageId = foundImage.Id;
          break;
        }
      }

      // If no matching architecture found, throw an error
      if (!buildOptions.imageId) {
        throw new Error(`No matching architecture found for ${buildArch}`);
      }
    } catch (error) {
      console.error('Error inspecting manifest to retrieve image ID', error);
    }
  }

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
    const timeoutLimit = 15; // Timeout after 15 seconds. This should be "instantaneous" to the API, but sometimes the API may be slow (reload of the page during `pnpm watch`, machine freezes, etc.).

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

async function getBuildConfigFile() {
  buildConfigFile = await bootcClient.selectBuildConfigFile();
}

function cleanup() {
  success = false;
  buildInProgress = false;
  buildErrorMessage = '';
  errorFormValidation = '';
}

onMount(async () => {
  isLinux = await bootcClient.isLinux();
  const images = await bootcClient.listBootcImages();

  // filter to images that have a repo tag here, to avoid doing it everywhere
  bootcAvailableImages = images.filter(image => image.RepoTags && image.RepoTags.length > 0);

  // Fills the build options with the last options
  const historyInfo = await bootcClient.listHistoryInfo();
  await fillBuildOptions(historyInfo);
  await fillArchitectures(historyInfo);

  if (isLinux) {
    await fillChownOption();
  }

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

// Updates the filesystem selection based upon the select image,
// specifically if the image is Fedora we will  have to select the filesystem (it cannot be default).
async function detectFedoraImageFilesystem(selectedImage: string) {
  const image = findImage(selectedImage);
  let imageLabels = image?.Labels;

  // If it is a manifest, we must find the child images associated to the manifest
  // in order to get the labels used to determine if it's based on Fedora or not
  if (image?.isManifest) {
    try {
      const manifest = await bootcClient.inspectManifest(image);
      const foundImages = await findImagesAssociatedToManifest(manifest);

      // Just get the labels from the first image, as they should all be the same.
      imageLabels = foundImages[0].Labels;
    } catch (error) {
      console.error('Error inspecting manifest:', error);
    }
  }

  // We use a specical label to determine what the bootc image was built against. We do not use "annotations" due to limitations of the PD API
  // that does not show the annotations of the inspect image.
  // Each build will have 'ostree.linux' added as a label, within that label it is either el9 (for centos / rhel) or fc40 for Fedora.
  // the format for example will be: "ostree.linux": "5.14.0-437.el9.x86_64", or "ostree.linux": "6.8.9-300.fc40.aarch64",
  // we can use this to determine if the bootc image was built upon.
  // We will use regex to determine if it is fedora or not by checking if it contains "fcNUMBER" where NUMBER is the version of Fedora.
  if (imageLabels && imageLabels['ostree.linux']) {
    const label = imageLabels['ostree.linux'];
    if (label.match(/fc\d+/)) {
      // Make sure that we show the fedora disclaimer and auto-select xfs if buildFilesystem is empty.
      fedoraDetected = true;
      if (buildFilesystem === '') {
        buildFilesystem = 'xfs';
      }
    } else {
      fedoraDetected = false;
      buildFilesystem = '';
    }
  }
}

// update the array of build types
async function updateBuildType(type: BuildType, selected: boolean) {
  if (selected) {
    buildType.push(type);
  } else {
    buildType = buildType.filter(t => t !== type);
  }
  validate();
}

// validate every time a selection changes in the form or available architectures
$: if (selectedImage || buildFolder || buildArch || overwrite) {
  validate();
}

// Each time an image is selected, we need to update the available architectures
// to do that, inspect the image and get the architecture.
$: if (selectedImage) {
  (async () => {
    await updateAvailableArchitectures(selectedImage);
    await detectFedoraImageFilesystem(selectedImage);
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

export function goToHomePage(): void {
  router.goto('/');
}
</script>

<FormPage
  title="Build Disk Image"
  inProgress={buildInProgress}
  breadcrumbLeftPart="Bootable Containers"
  breadcrumbRightPart="Build Disk Image"
  breadcrumbTitle="Go back to homepage"
  onclose={goToHomePage}
  onbreadcrumbClick={goToHomePage}>
  <DiskImageIcon slot="icon" size="30px" />

  <div slot="content" class="p-5 min-w-full h-fit">
    {#if success}
      <EmptyScreen
        icon={DiskImageIcon}
        title="Build task started"
        message="Check your progress by viewing the build container, or clicking the tasks button in the bottom right corner of Podman Desktop.">
        <Button
          class="py-3"
          on:click={() => {
            cleanup();
            router.goto('/');
          }}>
          Go back
        </Button>
      </EmptyScreen>
    {:else if buildErrorMessage}
      <EmptyScreen icon={faTriangleExclamation} title="Error with image build" message={buildErrorMessage}>
        <Button
          class="py-3"
          on:click={() => {
            cleanup();
            router.goto('/');
          }}>
          Go back
        </Button>
      </EmptyScreen>
    {:else}
      <div
        class="bg-[var(--pd-content-card-bg)] pt-5 space-y-6 px-8 sm:pb-6 xl:pb-8 rounded-lg text-[var(--pd-content-card-header-text)]">
        <div class={buildInProgress ? 'opacity-40 pointer-events-none' : ''}>
          <div class="pb-4">
            <label for="modalImageTag" class="block mb-2 font-semibold">Bootable container image</label>
            <div class="relative">
              <!-- Container with relative positioning -->
              <select
                class="rounded-lg block w-full p-2.5 bg-charcoal-600 pl-8 border-r-8 border-transparent outline-1 outline outline-gray-900 placeholder-gray-700 text-white"
                name="imageChoice"
                aria-label="image-select"
                bind:value={selectedImage}>
                <!-- Options go here -->
                {#if !selectedImage}
                  <option value="" disabled selected>Select an image</option>
                {/if}
                {#if bootcAvailableImages.length > 0}
                  {#each bootcAvailableImages as image}
                    <!-- Repo tags is an array, only show if it is > 0 and show the first one -->
                    {#if image.RepoTags && image.RepoTags.length > 0}
                      <option value={image.RepoTags[0]}>{image.RepoTags[0]}</option>
                    {/if}
                  {/each}
                {/if}
              </select>
              <!-- Position icon absolutely within the relative container -->
              {#if bootcAvailableImages.length === 0}
                <Fa
                  class="absolute left-0 top-0 ml-2 mt-3 text-[var(--pd-state-warning)]"
                  size="1x"
                  icon={faTriangleExclamation} />
              {:else if selectedImage}
                <Fa class="absolute left-0 top-0 ml-2 mt-3 text-[var(--pd-state-success)]" size="1x" icon={faCube} />
              {:else}
                <Fa
                  class="absolute left-0 top-0 ml-2 mt-3 text-[var(--pd-state-warning)]"
                  size="1x"
                  icon={faQuestionCircle} />
              {/if}
            </div>
            {#if bootcAvailableImages.length === 0}
              <p class="text-[var(--pd-state-warning)] pt-1">
                No bootable container compatible images found. Learn to create one on our <a
                  class="text-purple-400 hover:bg-white hover:bg-opacity-10 transition-all rounded-[4px] p-0.5 no-underline cursor-pointer"
                  href="https://github.com/containers/podman-desktop-extension-bootc">README</a
                >.
              </p>
            {/if}
          </div>
          <div>
            <label for="path" class="block mb-2 font-semibold">Output folder</label>
            <div class="flex flex-row space-x-3">
              <Input
                name="path"
                id="path"
                bind:value={buildFolder}
                placeholder="Output folder"
                class="w-full"
                aria-label="folder-select" />
              <Button on:click={() => getPath()}>Browse...</Button>
            </div>
          </div>
          <div class="pt-3 space-y-3 h-fit">
            <div class="mb-2">
              <span class="text-md font-semibold mb-2 block">Disk image type</span>
              <div class="flex flex-col ml-1 space-y-2">
                <Checkbox
                  checked={buildType.includes('raw')}
                  title="raw-checkbox"
                  on:click={e => updateBuildType('raw', e.detail)}>
                  RAW image with partition table (*.raw)
                </Checkbox>
                <Checkbox
                  checked={buildType.includes('qcow2')}
                  title="qcow2-checkbox"
                  on:click={e => updateBuildType('qcow2', e.detail)}>
                  Virtualization Guest Image (*.qcow2)
                </Checkbox>
                <Checkbox
                  checked={buildType.includes('anaconda-iso')}
                  title="iso-checkbox"
                  on:click={e => updateBuildType('anaconda-iso', e.detail)}>
                  Unattended Anaconda ISO Installer (*.iso)
                </Checkbox>
                <Checkbox
                  checked={buildType.includes('vmdk')}
                  title="vmdk-checkbox"
                  on:click={e => updateBuildType('vmdk', e.detail)}>
                  Virtual Machine Disk image (*.vmdk)
                </Checkbox>
                <Checkbox
                  checked={buildType.includes('ami')}
                  title="ami-checkbox"
                  on:click={e => updateBuildType('ami', e.detail)}>
                  Amazon Machine Image (*.ami)
                </Checkbox>
                <Checkbox
                  checked={buildType.includes('vhd')}
                  title="vhd-checkbox"
                  on:click={e => updateBuildType('vhd', e.detail)}>
                  Virtual Hard Disk (*.vhd)
                </Checkbox>
              </div>
            </div>
            <div>
              <span class="font-semibold mb-2 block">Filesystem</span>
              <div class="flex items-center mb-3 space-x-3">
                <label for="defaultFs" class="ml-1 flex items-center cursor-pointer" aria-label="default-radio">
                  <input
                    bind:group={buildFilesystem}
                    disabled={fedoraDetected}
                    type="radio"
                    id="defaultFs"
                    name="filesystem"
                    value=""
                    class="sr-only peer"
                    aria-label="default-filesystem-select" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-[var(--pd-input-checkbox-unchecked)] mr-2 peer-checked:border-[var(--pd-input-checkbox-checked)] peer-checked:bg-[var(--pd-input-checkbox-checked)]">
                  </div>
                  <span class={fedoraDetected ? 'text-[var(--pd-input-field-disabled-text)]' : ''}>Default</span>
                </label>
                <label for="xfsFs" class="ml-1 flex items-center cursor-pointer" aria-label="xfs-radio">
                  <input
                    bind:group={buildFilesystem}
                    type="radio"
                    id="xfsFs"
                    name="filesystem"
                    value="xfs"
                    class="sr-only peer"
                    aria-label="xfs-filesystem-select" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-[var(--pd-input-checkbox-unchecked)] mr-2 peer-checked:border-[var(--pd-input-checkbox-checked)] peer-checked:bg-[var(--pd-input-checkbox-checked)]">
                  </div>
                  <span>XFS</span>
                </label>
                <label for="ext4Fs" class="ml-1 flex items-center cursor-pointer" aria-label="ext4-radio">
                  <input
                    bind:group={buildFilesystem}
                    type="radio"
                    id="ext4Fs"
                    name="filesystem"
                    value="ext4"
                    class="sr-only peer"
                    aria-label="ext4-filesystem-select" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-[var(--pd-input-checkbox-unchecked)] mr-2 peer-checked:border-[var(--pd-input-checkbox-checked)] peer-checked:bg-[var(--pd-input-checkbox-checked)]">
                  </div>
                  <span>EXT4</span>
                </label>
                <label for="btrfsFs" class="ml-1 flex items-center cursor-pointer" aria-label="btrfs-radio">
                  <input
                    bind:group={buildFilesystem}
                    type="radio"
                    id="btrfsFs"
                    name="filesystem"
                    value="btrfs"
                    class="sr-only peer"
                    aria-label="btrfs-filesystem-select" />
                  <div
                    class="w-4 h-4 rounded-full border-2 border-[var(--pd-input-checkbox-unchecked)] mr-2 peer-checked:border-[var(--pd-input-checkbox-checked)] peer-checked:bg-[var(--pd-input-checkbox-checked)]">
                  </div>
                  <span>BTRFS</span>
                </label>
              </div>
              <p class="text-sm text-[var(--pd-content-text)]">
                {#if fedoraDetected}
                  Fedora detected. By default Fedora requires a specific filesystem to be selected. XFS is recommended.
                {:else}
                  The default filesystem is automatically detected based on the base container image. However, some
                  images such as Fedora may require a specific filesystem to be selected.
                {/if}
              </p>
            </div>
            <div class="mb-2">
              <span class="font-semibold mb-2 block">Platform</span>
              <ul class="grid grid-cols-2 gap-x-2 max-w-md">
                <li>
                  <input
                    bind:group={buildArch}
                    type="radio"
                    id="arm64"
                    name="arch"
                    value="arm64"
                    class="sr-only peer"
                    aria-label="arm64-select"
                    disabled={!availableArchitectures.includes('arm64')} />
                  <label
                    for="arm64"
                    class="h-full flex items-center p-5 cursor-pointer rounded-md bg-[var(--pd-content-card-inset-bg)] focus:outline-none border-[var(--pd-content-card-border-selected)] peer-checked:bg-[var(--pd-content-card-hover-inset-bg)] {availableArchitectures.includes(
                      'arm64',
                    )
                      ? 'border-2 cursor-pointer'
                      : 'border-0 opacity-50'}"
                    aria-label="arm64-button">
                    <i class="fab fa-linux fa-2x"></i>
                    <br />
                    <span class="ml-2">ARM® aarch64 systems</span>
                  </label>
                </li>
                <li>
                  <input
                    bind:group={buildArch}
                    type="radio"
                    id="amd64"
                    name="arch"
                    value="amd64"
                    class="sr-only peer"
                    aria-label="amd64-select"
                    disabled={!availableArchitectures.includes('amd64')} />
                  <label
                    for="amd64"
                    class="h-full flex items-center p-5 cursor-pointer rounded-md bg-[var(--pd-content-card-inset-bg)] focus:outline-none border-[var(--pd-content-card-border-selected)] peer-checked:bg-[var(--pd-content-card-hover-inset-bg)] {availableArchitectures.includes(
                      'amd64',
                    )
                      ? 'border-2 cursor-pointer'
                      : 'border-0 opacity-50'}"
                    aria-label="amd64-button">
                    <i class="fab fa-linux fa-2x"></i>
                    <br />
                    <span class="ml-2">Intel and AMD x86_64 systems</span>
                  </label>
                </li>
              </ul>
              <p class="text-sm text-[var(--pd-content-text)] pt-2">
                Disk image architecture must match the architecture of the original image. For example, you must have an
                ARM container image to build an ARM disk image. You can only select the architecture that is detectable
                within the image or manifest.
              </p>
            </div>
            <div class="mb-2">
              <!-- Use a span for this until we have a "dropdown toggle" UI element implemented. -->
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <span
                class="font-semibold mb-2 block cursor-pointer"
                aria-label="advanced-options"
                on:click={toggleAdvanced}
                ><Fa icon={showAdvanced ? faCaretDown : faCaretRight} class="inline-block mr-1" />Advanced Options
              </span>
              {#if showAdvanced}
                <!-- Build config -->
                <div class="mb-2">
                  <label for="buildconfig" class="block mb-2 font-semibold">Build config</label>
                  <div class="flex flex-row space-x-3">
                    <Input
                      name="buildconfig"
                      id="buildconfig"
                      bind:value={buildConfigFile}
                      placeholder="Build configuration file (config.toml or config.json)"
                      class="w-full"
                      aria-label="buildconfig-select" />
                    <Button on:click={() => getBuildConfigFile()}>Browse...</Button>
                  </div>
                  <p class="text-sm text-[var(--pd-content-text)] pt-2">
                    The build configuration file is a TOML or JSON file that contains the build options for the disk
                    image. Customizations include user, password, SSH keys and kickstart files. More information can be
                    found in the <Link
                      externalRef="https://github.com/osbuild/bootc-image-builder?tab=readme-ov-file#-build-config"
                      >bootc-image-builder documentation</Link
                    >.
                  </p>
                </div>

                <!-- chown, this option is only available for Linux users -->
                {#if isLinux}
                  <div class="mb-2">
                    <label for="chown" class="block mb-2 font-semibold">Change file owner and group</label>
                    <div class="flex flex-row space-x-3">
                      <Input
                        name="chown"
                        id="chown"
                        bind:value={buildChown}
                        placeholder="UID and GID parameters (ex. 1000:1000)"
                        class="w-full"
                        aria-label="chown-select" />
                    </div>
                    <p class="text-sm text-[var(--pd-content-text)] pt-2">
                      Linux only. By default the UID and GID of the current user is used. This option allows you to
                      change the owner and group of the files in the output directory.
                    </p>
                  </div>
                {/if}

                <!-- AWS -->
                <div>
                  <span class="font-semibold block">Upload image to AWS</span>
                </div>

                <label for="amiName" class="block mt-2 text-sm font-bold">AMI Name</label>
                <Input
                  bind:value={awsAmiName}
                  name="amiName"
                  id="amiName"
                  placeholder="AMI Name to be used"
                  class="w-full" />

                <label for="awsBucket" class="block mt-2 text-sm font-bold">S3 Bucket</label>
                <Input
                  bind:value={awsBucket}
                  name="awsBucket"
                  id="awsBucket"
                  placeholder="AWS S3 bucket"
                  class="w-full" />

                <label for="awsRegion" class="block mt-2 text-sm font-bold">S3 Region</label>
                <Input
                  bind:value={awsRegion}
                  name="awsRegion"
                  id="awsRegion"
                  placeholder="AWS S3 region"
                  class="w-full" />

                <p class="text-sm text-[var(--pd-content-text)] pt-2">
                  This will upload the image to a specific AWS S3 bucket. Credentials stored at ~/.aws/credentials will
                  be used for uploading. You must have <Link
                    externalRef="https://docs.aws.amazon.com/vm-import/latest/userguide/required-permissions.html"
                    >vmimport service role</Link> configured to upload to the bucket.
                </p>
              {/if}
            </div>
          </div>
        </div>
        {#if existingBuild}
          <Checkbox class="ml-1" title="overwrite-checkbox" bind:checked={overwrite}>Overwrite existing build</Checkbox>
        {/if}
        {#if errorFormValidation}
          <ErrorMessage aria-label="validation" error={errorFormValidation} />
        {/if}
        {#if buildInProgress}
          <Button class="w-full" disabled={true}>Creating build task</Button>
        {:else}
          <Button on:click={() => buildBootcImage()} disabled={errorFormValidation != undefined} class="w-full"
            >Build</Button>
          <!-- If on Linux, warn that during the build, credentials will be asked in order to run an escalated privileged build prompt -->
          {#if isLinux}
            <p class="text-sm text-[var(--pd-content-text)] pt-1">
              For Linux users during the build, you will be asked for your credentials in order to run an escalated
              privileged build prompt for the build process.
            </p>
          {/if}
        {/if}
      </div>
    {/if}
  </div></FormPage>
