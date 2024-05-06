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
- [Contributing](#contributing)

## Technology

The **Bootable Container (bootc)** extension uses [bootc-image-builder](https://github.com/osbuild/bootc-image-builder) in order to build bootable *container* disk images.

Once a machine is created from the disk image, it can apply transactional updates "in place" from newly pushed container images (without creating a new disk image). For more information, see [bootc](https://containers.github.io/bootc/).

## Bootable Container Images

There are many projects at work at creating "bootc" images. Below is a non-exhaustive list of compatible images which are known to work with [`bootc-image-builder`](https://github.com/osbuild/bootc-image-builder).

**CentOS:**

- Containerfile: `FROM quay.io/centos-bootc/centos-bootc:stream9`
- Repo: [`quay.io/centos-bootc/centos-bootc:stream9`](https://quay.io/centos-bootc/centos-bootc)
- Example Images: [gitlab.com/bootc-org/examples](https://gitlab.com/bootc-org/examples)
- Documentation: [fedoraproject.org](https://docs.fedoraproject.org/en-US/bootc/)
- Source: [github.com/centos/centos-bootc](https://github.com/centos/centos-bootc)
- Notes: N/A

**Fedora:**

- Containerfile: `FROM quay.io/fedora/fedora-bootc:40`
- Repo: [`quay.io/fedora/fedora-bootc:40`](https://quay.io/fedora/fedora-bootc)
- Example Images: [gitlab.com/bootc-org/examples](https://gitlab.com/bootc-org/examples)
- Documentation: [fedoraproject.org](https://docs.fedoraproject.org/en-US/bootc/)
- Source: [gitlab.com/fedora/bootc/base-images](https://gitlab.com/fedora/bootc/base-images)
- Notes: Must select "XFS" or "EXT4" for the root filesystem when building in the GUI. [Read more here.](https://docs.fedoraproject.org/en-US/bootc/default-rootfs-type/)


The images can then be added to your Containerfile:

```Dockerfile
FROM quay.io/centos-bootc/centos-bootc:stream9
```

### Learning more

- [Fedora Building Containers Guide](https://docs.fedoraproject.org/en-US/bootc/building-containers/): provides an overview on how to create Fedora/CentOS-derived bootc images.
- [Bootc General Guidance](https://containers.github.io/bootc/building/guidance.html): provides a general configuration overview for bootc images.

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

All of our maintained example images are on the [gitlab.com/bootc-org/examples](https://gitlab.com/bootc-org/examples) repo.

You can also pull our example image based on the [`httpd`](https://gitlab.com/bootc-org/examples/-/tree/main/httpd) example:

![](https://raw.githubusercontent.com/containers/podman-desktop-media/bootc-extension/gifs/clicking_pull.gif)

After building, read our [Virtual Machine Guide](https://github.com/containers/podman-desktop-extension-bootc/blob/main/docs/vm_guide.md) on how to launch your image and access your HTTP server.

## Use Case

Go from a [bootc](https://containers.github.io/bootc/) compatible derived container build to a disk image format:

* `qcow2`: QEMU Disk Images
* `ami`: Amazon Machine Images
* `raw`: RAW disk image an MBR or GPT partition table
* `iso`: Unattended installation method (USB sticks / install-on-boot)
* `vmdk`: Usable in vSphere

The list above is what is supported by the underlying `bootc-image-builder` technology. The list can [be found here](https://github.com/osbuild/bootc-image-builder?tab=readme-ov-file#-image-types).

## Requirements

### Requirement 1. Software and hardware requirements

**OS:**

Compatible on Windows, macOS & Linux

**Software:**
* [Podman Desktop 1.10.0+](https://github.com/containers/podman-desktop)
* [Podman 5.0.1+](https://github.com/containers/podman)

### Requirement 2. Rootful mode on Podman Machine

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

**Linux users:** 

On Linux, you are unable to create a Podman Machine through the GUI of Podman Desktop, to create a rootful Podman Machine you can run the following commands:

```sh
podman machine init --rootful
podman machine start
```

## Installation

This extension can be installed through the **Extensions** section of Podman Desktop:

1. Go to *Extensions* in the navbar.
2. Copy and paste the below image to the *Install custom...* section:

```
ghcr.io/containers/podman-desktop-extension-bootc
```

3. Click *Install*.

![](https://raw.githubusercontent.com/containers/podman-desktop-media/bootc-extension/gifs/install_extension_new.gif)

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

## Contributing

Want to help develop and contribute to the bootc extension? View our [CONTRIBUTING](https://github.com/containers/podman-desktop-extension-bootc/blob/main/CONTRIBUTING.md) document.
