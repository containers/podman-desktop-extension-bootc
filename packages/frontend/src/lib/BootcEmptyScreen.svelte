<script lang="ts">
import EmptyScreen from './upstream/EmptyScreen.svelte';
import BootcSelkie from './BootcSelkie.svelte';
import Button from './upstream/Button.svelte';
import { bootcClient } from '../api/client';

const BASE_URL = 'https://github.com/containers/podman-desktop-extension-bootc';
const CONTAINERFILE_GUIDE = BASE_URL + '/blob/main/docs/containerfile_guide.md';
const EXAMPLES_URL = 'https://gitlab.com/bootc-org/examples';

async function openUrl(url: string) {
  await bootcClient.openUrl(url);
}
</script>

<EmptyScreen
  icon="{BootcSelkie}"
  iconSize="150"
  title="No past bootc builds found"
  message="Start your first build by clicking the 'Build' button, or follow a link below">
  <div class="p-10 pt-5">
    <div class="text-center">
      <div class="flex justify-center items-stretch space-x-4 rounded-xl bg-charcoal-600">
        <div class="flex-1 p-6 text-white">
          <div class="flex flex-col items-center mb-2">
            <i class="fas fa-globe text-3xl mb-3"></i>
            <h2 class="text-lg font-semibold">Hello World guide</h2>
            <p>Learn all about what bootable containers are</p>
          </div>
          <Button class="justify-self-center self-end mt-2" on:click="{() => openUrl(BASE_URL)}" title="Visit Now"
            >Visit Now</Button>
        </div>
        <div class="flex-1 p-6 text-white">
          <div class="flex flex-col items-center mb-2">
            <i class="fas fa-question-circle text-3xl mb-3"></i>
            <h2 class="text-lg font-semibold">Create a custom image</h2>
            <p>Create your own custom container image</p>
          </div>
          <Button
            class="justify-self-center self-end mt-2"
            on:click="{() => openUrl(CONTAINERFILE_GUIDE)}"
            title="Visit Now">Visit Now</Button>
        </div>
        <div class="flex-1 p-6 text-white">
          <div class="flex flex-col items-center mb-2">
            <i class="fas fa-graduation-cap text-3xl mb-3"></i>
            <h2 class="text-lg font-semibold">Example images</h2>
            <p>Choose from multiple examples and templates</p>
          </div>
          <Button class="justify-self-center self-end mt-2" on:click="{() => openUrl(EXAMPLES_URL)}" title="Visit Now"
            >Visit Now</Button>
        </div>
      </div>
    </div>
  </div>
</EmptyScreen>
