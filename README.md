# BootC (Bootable Container) Extension for Podman Desktop

![](https://raw.githubusercontent.com/containers/podman-desktop-extension-bootc/main/docs/img/logo.png)

Want to create a bootable operating system from a Containerfile? Download this extension!

Easily go from container to VM / ISO-on-a-USB / RAW image!

## Topics

- [Technology](#technology)
- [Bootable Container Images](#bootable-container-images)
- [Read Before Using](#read-before-using)
- [Example Images](#example-images)
- [Use Case](#use-case)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Preferences](#preferences)
- [Known Issues](#known-issues)
- [Contributing](#contributing)

## Technology

The **Bootable Container (bootc)** extension uses [bootc-image-builder](https://github.com/osbuild/bootc-image-builder) in order to build bootable *container* disk images.

Once a machine is created from the disk image, it can apply transactional updates "in place" from newly pushed container images (without creating a new disk image). For more information, see [bootc](https://containers.github.io/bootc/).

## Bootable Container Images

There are many projects at work at creating "bootc" images. Below is a non-exhaustive list of compatible images which are known to work with [`bootc-image-builder`](https://github.com/osbuild/bootc-image-builder).

**CentOS:**

- Containerfile: `FROM quay.io/centos-bootc/centos-bootc:stream9`
- Repo: [`quay.io/centos-bootc/centos-bootc:stream9`](https://quay.io/centos-bootc/centos-bootc)
- Example Images: [gitlab.com/fedora/bootc/examples](https://gitlab.com/fedora/bootc/examples)
- Documentation: [fedoraproject.org](https://docs.fedoraproject.org/en-US/bootc/)
- Notes: N/A

**Fedora:**

- Containerfile: `FROM quay.io/fedora/fedora-bootc:40`
- Repo: [`quay.io/fedora/fedora-bootc:40`](https://quay.io/fedora/fedora-bootc)
- Example Images: [gitlab.com/fedora/bootc/examples](https://gitlab.com/fedora/bootc/examples)
- Documentation: [fedoraproject.org](https://docs.fedoraproject.org/en-US/bootc/)
- Notes: Must select "XFS", "EXT4" or "BTRFS" for the root filesystem when building in the GUI. [Read more here.](https://docs.fedoraproject.org/en-US/bootc/default-rootfs-type/)

**RHEL:**

- Containerfile: `FROM registry.redhat.io/rhel9/rhel-bootc:9.4`
- Repo: [`registry.redhat.io/rhel9/rhel-bootc:9.4`](https://catalog.redhat.com/search?gs&q=bootc)
- Documentation: [Red Hat Customer Portal](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems/index#doc-wrapper)


The images can then be added to your Containerfile:

```Dockerfile
FROM quay.io/centos-bootc/centos-bootc:stream9
```

### Learning more

If you want to learn more about bootable containers, please refer to the [Fedora Getting Started Guide](https://docs.fedoraproject.org/en-US/bootc/getting-started/) where you can find a number of videos, demos, best practices and detailed information.

## Read Before Using

Some concepts to grasp before using.

### **Think of it as an OS provisioning tool!**

You are "creating" an OS straight from a Containerfile, isn't that awesome?

**FIRST** realize that you are creating an OS with all your applications, developer tools, even games that you want.

**SECONDLY** ask yourself what applications you want to have running (perhaps on boot too!).

### Creating your first bootable OS Containerfile

Want a quick straight-to-the-point Hello World Containerfile?

```Dockerfile
FROM quay.io/centos-bootc/centos-bootc:stream9
# Change your root password for a "test login" that
# allows to log in on a virtual/physical console
# NOTE: While some base images may set `PermitRootLogin prohibit-password`
# for OpenSSH, not all will.
# This is VERY dangerous and only meant for Hello World purposes.
RUN echo "root:root" | chpasswd
```

After creating your image you can now login and explore your bootable OS.

## Example images

Want to view more example images Such as [`httpd`](https://gitlab.com/bootc-org/examples/-/tree/main/httpd) and [`nvidia`](https://gitlab.com/bootc-org/examples/-/tree/main/nvidia)?

All of our maintained example images are on the [gitlab.com/fedora/bootc/examples](https://gitlab.com/fedora/bootc/examples) repo.

You can also pull our example image based on the [`httpd`](https://gitlab.com/bootc-org/examples/-/tree/main/httpd) example:

![](https://raw.githubusercontent.com/containers/podman-desktop-media/bootc-extension/gifs/clicking_pull.gif)

After building, read our [Virtual Machine Guide](https://github.com/containers/podman-desktop-extension-bootc/blob/main/docs/vm_guide.md) on how to launch your image and access your HTTP server.

## Use Case

Go from a [bootc](https://containers.github.io/bootc/) compatible derived container build to a disk image format:

* `qcow2`: QEMU Disk Images
* `ami`: Amazon Machine Images
* `raw`: RAW disk image an MBR or GPT partition table
* `anaconda-iso`: Unattended installation method (USB sticks / install-on-boot)
* `vmdk`: Usable in vSphere
* `vhd`: Virtual Hard Disk

The list above is what is supported by the underlying `bootc-image-builder` technology. The list can [be found here](https://github.com/osbuild/bootc-image-builder?tab=readme-ov-file#-image-types).

## Requirements

### Prerequisites: Software and hardware requirements

**OS:**

Compatible on Windows, macOS & Linux

**Software:**
* [Podman Desktop 1.10.0+](https://github.com/containers/podman-desktop)
* [Podman 5.0.1+](https://github.com/containers/podman)

### Podman Machine (macOS / Windows)

Podman Machine is required for macOS and Windows in order to run Podman as well as utilize filesystem privileges to build a disk image.

Podman Machine requirements:
* **Rootful mode enabled**
* *At least* 6GB of RAM allocated in order to build the disk image

Rootful mode can be enabled through the CLI to an already deployed VM:

```sh
podman machine stop
podman machine set --rootful
podman machine start
```

Or set when initially creating a Podman Machine via Podman Desktop:

![rootful setup](https://raw.githubusercontent.com/containers/podman-desktop-extension-bootc/main/docs/img/rootful_setup.png)

### Escalated Privileges (Linux)

During the build process, **you will be asked to enter your credentials** so that the bootc extension may run a `sudo podman run` underlying CLI command.

Podman Desktop is ran as the logged-in user. However, bootc-image-builder requires escalated / sudo privileges to run a rootful container.

You can find more information about what specific commands are being ran from the console logs of Podman Desktop.


## Installation

This extension can be installed through the **Extensions** section of Podman Desktop within the **Catalog** tab:

1. Go to **Extensions** in the navbar.
2. Click on the **Catalog** tab.
3. Install the extension.

![](https://raw.githubusercontent.com/containers/podman-desktop-media/bootc-extension/gifs/catalog_install.gif)

### Nightly version 

A version of the extension using the latest commit changes can be installed via the **Install custom...** button with the following link:

```
ghcr.io/containers/podman-desktop-extension-bootc:nightly
```

## Usage

1. **Build your bootc-enabled Containerfile:**

> In the example below, we are going to change the root password for testing purposes when accessing the OS. 

```Dockerfile
FROM quay.io/centos-bootc/centos-bootc:stream9

# Change the root password
# CAUTION: This is NOT recommended and is used only for testing / hello world purposes
RUN echo "root:root" | chpasswd
```

![](https://raw.githubusercontent.com/containers/podman-desktop-media/bootc-extension/gifs/build_image.gif)

2. **Build the disk image:**

> Build the disk image, this takes approximatley 2-5 minutes depending on the performance of your machine.

![](https://raw.githubusercontent.com/containers/podman-desktop-media/bootc-extension/gifs/bootc_building.gif)

3. **Launching the VM:**

> See our [Virtual Machine Guide](https://github.com/containers/podman-desktop-extension-bootc/blob/main/docs/vm_guide.md) on how to launch the image!

![](https://raw.githubusercontent.com/containers/podman-desktop-media/bootc-extension/gifs/os_booting.gif)

## Preferences

Preferences such as the default `bootc-builder-image` as well as timeouts can be adjusted within the **Preferences** section of Podman Desktop.

![](https://raw.githubusercontent.com/containers/podman-desktop-extension-bootc/main/docs/img/preferences.png)

## Known issues

**Unable to build cross-arch images on macOS and Windows:**

This is a [known issue](https://github.com/containers/podman-desktop-extension-bootc/issues/808) when attempting to build cross-architecture images using Podman Machine on macOS and Windows. For example, building an x86 image on macOS with Apple Silicon (ARM).

The issue stems from a missing [openat2](https://www.mail-archive.com/qemu-devel@nongnu.org/msg1064233.html) system call in QEMU, which has now been patched upstream. While waiting for the patch to be incorporated into Podman Machine, Fedora packages have been created to address the issue.

Your Podman Machine might not have the required QEMU patch to build cross-architecture images.

**macOS only**:

1. Delete your current Podman Machine via **Settings > Resources > Podman**.
2. Disable Rosetta under **Settings > Preferences > Extension: Podman > Rosetta**.
3. Create a new Podman Machine.

**Windows and macOS**:

1. Start your Podman Machine.
2. SSH into the Podman Machine:

```sh
podman machine ssh
```

3. Override the QEMU binaries:

If your host machine is x86 (AMD64), run:

```sh
rpm-ostree override replace https://download.copr.fedorainfracloud.org/results/michaelvogt/qemu-user-with-openat2/fedora-40-x86_64/08033635-qemu/qemu-user-8.2.6-3.mvo1.fc40.x86_64.rpm 
rpm-ostree override replace https://download.copr.fedorainfracloud.org/results/michaelvogt/qemu-user-with-openat2/fedora-40-x86_64/08033635-qemu/qemu-user-static-aarch64-8.2.6-3.mvo1.fc40.x86_64.rpm
```

If your host machine is ARM (ARM64), run:

```sh
rpm-ostree override replace https://download.copr.fedorainfracloud.org/results/michaelvogt/qemu-user-with-openat2/fedora-40-aarch64/08033635-qemu/qemu-user-8.2.6-3.mvo1.fc40.aarch64.rpm 
rpm-ostree override replace https://download.copr.fedorainfracloud.org/results/michaelvogt/qemu-user-with-openat2/fedora-40-aarch64/08033635-qemu/qemu-user-static-x86-8.2.6-3.mvo1.fc40.aarch64.rpm
```

4. Restart your Podman Machine:

```sh
podman machine stop
podman machine start
```

To undo the fix, either delete and re-create the Podman Machine, or:

```sh
podman machine ssh
rpm-ostree override reset --all
```

## Contributing

Want to help develop and contribute to the bootc extension? View our [CONTRIBUTING](https://github.com/containers/podman-desktop-extension-bootc/blob/main/CONTRIBUTING.md) document.
