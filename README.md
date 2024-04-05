# BootC (Bootable Container) Extension for Podman Desktop

Want to create a bootable operating system from a Containerfile? Download this extension!

Easily go from container to VM / ISO-on-a-USB / RAW image!

## Topics

- [Technology](#technology)
- [Read Before Using](#read-before-using)
- [Extension Features](#extension-features)
- [Use Case](#use-case)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)

## Technology

The **Bootable Container (bootc)** extension utilizes [bootc-image-builder](https://github.com/osbuild/bootc-image-builder) in order to create bootable container disk images which derive from
a bootable input *container* image. The "source of truth" in general is the container image,
and the disk images are derived from it. Once a machine is created from the disk image, it
can apply transactional updates "in place" from newly pushed container images (without creating a new disk image).

For more, see [bootc](https://containers.github.io/bootc/).

The **ONLY** currently supported base image is [`quay.io/centos-bootc/centos-bootc`](https://centos.github.io/centos-bootc). More are to be supported in the future!

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
# for OpenSSH, not all will. Those that don't make this pattern
# very dangerous; prefer using SSH keys over passwords
# to the greatest extent possible.
RUN echo "root:root" | chpasswd
```

(This example is used for the "run a VM locally" below)

Want to learn more?

- [bootc generic guidance](https://containers.github.io/bootc/building/guidance.html) which covers users/groups and SSH keys
- [our Containerfile Guide!](/docs/containerfile_guide.md) We also explain how to add your first "run-on-boot" application!

## Extension Features

* Create bootable container images
* One-click launching of VM's
* Built-in Podman Desktop UI additions to help differentiate bootc to normal containers (bootc badges in images)
* Custom icon to help indicate bootc containers

## Use Case

Go from a [bootc](https://containers.github.io/bootc/) compatible derived container build to a disk image format:

* `qcow2`: QEMU Disk Images
* `ami`: Amazon Machine Images
* `raw`: RAW disk image an MBR or GPT partition table
* `iso`: Unattended installation method (USB Sticks / Install-on-boot)

(The canonical supported list is maintained as part of `bootc-image-builder`)

## Requirements

Disclaimer: This is **EXPERIMENTAL** and all features are subject to change as we develop the extension.

### Requirement 1. Software and hardware requirements

**OS:**

Compatible on Windows, macOS & Linux

**Software:**
* [Podman Desktop 1.8.0+](https://github.com/containers/podman-desktop)
* [Podman 5.0.0+](https://github.com/containers/podman)

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

![rootful setup](/docs/img/rootful_setup.png)

**Linux users:** 

On Linux, you are unable to create a Podman Machine through the GUI of Podman Desktop, to create a rootful Podman Machine you can run the following commands:

```sh
podman machine init --rootful
podman machine start
```

## Installation

This extension can be installed through the **Extensions** page of Podman Desktop:

1. Go to *Settings > Extensions*.
2. Copy and paste the below image to the *Name of the image* field:

```
ghcr.io/containers/podman-desktop-extension-bootc
```

3. Click *Install extension from the OCI image*.

[![](/docs/img/install_extension.gif)](https://github.com/containers/podman-desktop-media/raw/bootc-extension/videos/install_extension.mp4)

## Usage

1. **Build your bootc-enabled Containerfile:**

> In our example, we are going to change the root password for testing purposes when accessing the OS.

```Dockerfile
FROM quay.io/centos-bootc/centos-bootc:stream9

# Change the root password
RUN echo "root:root" | chpasswd
```

[![](/docs/img/build_container.gif)](https://github.com/containers/podman-desktop-media/raw/bootc-extension/videos/build_container.mp4)

2. **Push the image:**

> IMPORTANT NOTE: This must be a **PUBLICALLY** accessible registry, this will be fixed in the future to use a local container storage

[![](/docs/img/push_container.gif)](https://github.com/containers/podman-desktop-media/raw/bootc-extension/videos/push_container.mp4)

3. **Build the image:**

> Build the disk image, this takes approximatley 2-5 minutes depending on the performance of your machine.

[![](/docs/img/press_build.gif)](https://github.com/containers/podman-desktop-media/raw/bootc-extension/videos/press_build.mp4)

4. **View the logs:**

> You can now view the conversion process within the Containers section

![](/docs/img/watch_logs.gif)

5. **Launching the VM:**

See our [Virtual Machine Guide](/docs/vm_guide.md) on how to launch the image!

6. **(EXPERIMENTAL) Testing within a container:**

> IMPORTANT NOTE: This does not represent a 1-1 conversion between container image to virtual machine image and is only meant for troubleshooting or developmental purposes.

[![](/docs/img/within_container.gif)](https://github.com/containers/podman-desktop-media/raw/bootc-extension/videos/within_container.mp4)

You can also test your image within a container BEFORE converting by initiating the `init` boot sequence.

**WARNINGS:** 
* Depending on your host system, you may get startup errors such as `[FAILED] Failed to start sshd.service - OpenSSH server daemon` this is because your test container is being ran in the same network space as another SSH server (most likely the podman machine)
* Your systemd unit may not start up correctly if a system port is already in use. Make sure for example, that port "8080" is free on the host system before testing.

#### Run the container with the following command or through the Podman Desktop UI:

```sh
export IMAGE=yourcontainerimage
podman run \
  -it \
  --rm \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --cap-add SYS_ADMIN \
  --cap-add SETUID \
  --cap-add SETGID \
  --cap-add mknod \
  --security-opt label=disable \
  --security-opt 'unmask=/proc/*' \
  --device=/dev/fuse \
  --network host \
  $IMAGE "/sbin/init"
```

#### Notes on parameters being passed:

The majority of these `--cap-add` commands are for the ability of running a "container within a container". This allows you to run a container such as: `podman run -p 8080:8080 quay.io/bootc-extension/helloworld` within another container for developmental purposes.

The rest have to do with enabling correct networking so you have correct DNS and networking resolution.

```sh
# Allows the correct "simulated" networking from within the container
--cap-add NET_ADMIN \ 
--cap-add NET_RAW \

# Disables SELinux, /proc errors
# allows the correct usage of the filesystem
--cap-add SYS_ADMIN \
--cap-add SETUID \
--cap-add SETGID \
--cap-add mknod \
--security-opt label=disable \
--security-opt 'unmask=/proc/*' \
--device=/dev/fuse \

# Allows the usage of the host networking / correct DNS resolution
--network host \
```

## Contributing

Want to help develop and contribute to the bootc extension?

You can use `yarn watch --extension-folder` from the Podman Desktop directory to automatically rebuild and test the bootc extension:

```sh
git clone https://github.com/containers/podman-desktop
git clone https://github.com/containers/podman-desktop-extension-bootc
cd podman-desktop
yarn watch --extension-folder ../podman-desktop-extension-bootc/packages/backend
```

### Testing & Developing

Workflow for developing would be the following:

```sh
# Bootc root folder:
yarn watch

# In a separate terminal in the Podman Desktop folder:
yarn watch --extension-folder ../podman-desktop-extension-bootc/packages/backend
```

Workflow for testing and validation checking before PR submission:

```sh
# Tests
yarn test

# Formatting, linting and typecheck
yarn format:fix
yarn lint:fix
yarn typecheck
```