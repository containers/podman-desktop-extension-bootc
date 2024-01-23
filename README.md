# BootC (Bootable Container) Extension for Podman Desktop

Want to convert your container to a bootable operating system? Download this extension!

Easily go from container to VM / ISO-on-a-USB / RAW image!

## Technology

The **Bootable Container (bootc)** extension utilizes [bootc-image-builder](https://github.com/osbuild/bootc-image-builder) in order to create bootable OS images. 

Within [bootc-image-builder](https://github.com/osbuild/bootc-image-builder) the tool uses [bootc](https://containers.github.io/bootc/) as a basis for conversion to achieve the bootable OS as well as libraries such as [libostree](https://ostreedev.github.io/ostree/) and [ostree-rs-ext](https://github.com/ostreedev/ostree-rs-ext).

## Extension Features

* Create bootable container images
* One-click launching of VM's
* Built-in Podman Desktop UI additions to help differentiate bootc to normal containers (bootc badges in images)
* Custom icon to help indicate bootc containers

## Use Case

Go from a a [bootc](https://containers.github.io/bootc/) compatible Containerfile:

```Containerfile
FROM quay.io/centos-bootc/fedora-bootc:eln

# Install an HTTP server
RUN dnf -y install httpd; dnf -y clean all
```

To a bootable OS image format:

* `qcow2`: QEMU Disk Images
* `ami`: Amazon Machine Images
* `raw`: RAW disk image an MBR or GPT partition table
* `iso`: Unattended installation method (USB Sticks / Install-on-boot)

## Requirements before Installation

Disclaimer: This is **EXPERIMENTAL** and all features are subject to change as we develop the extension.

### Requirement 1. System requirements

* macOS M1/M2/M3 Silicon Architecture ONLY (Windows & Linux support coming soon)
* [podman 4.9.0+](https://github.com/containers/podman/releases/tag/v4.9.0)
* [vfkit 0.5.1+](https://github.com/crc-org/vfkit) for "one-click" VM launch button support

### Requirement 2. Rootful mode on Podman Machine

Make sure your `podman machine` has rootful mode enabled.

This can be done through the CLI to an already deployed VM:

```sh
podman machine stop
podman machine set --rootful
podman machine start
```

Or set when initially creating a Podman Machine via Podman Desktop:

![rootful setup](/docs/img/rootful_setup.png)

### Requirement 3. Vfkit installed for automatic VM preview

> NOTE: MacOS only. Only applicable if you would like to view the VM with one-click. Otherwise, use the raw / qcow2 / iso.

[Vfkit](https://github.com/crc-org/vfkit) is a CLI interface to create virtual machines using Apple's virtualization framework.

This can be [installed via brew](https://github.com/crc-org/vfkit?tab=readme-ov-file#installation):

```sh
brew tap cfergeau/crc
brew install vfkit
```

## Installation

Each new commit to `main` will produce a new release to [ghcr.io/containers/podman-desktop-extension-bootc](https://ghcr.io/containers/podman-desktop-extension-bootc).

Use the `ghcr.io/containers/podman-desktop-extension-bootc` image.

This can be installed through the **Extensions** page of Podman Desktop:

<video src="https://private-user-images.githubusercontent.com/6422176/297750246-9757119f-99b2-44c1-8cc2-236e0f2d25d5.mov?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MDU1ODM3MjgsIm5iZiI6MTcwNTU4MzQyOCwicGF0aCI6Ii82NDIyMTc2LzI5Nzc1MDI0Ni05NzU3MTE5Zi05OWIyLTQ0YzEtOGNjMi0yMzZlMGYyZDI1ZDUubW92P1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI0MDExOCUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNDAxMThUMTMxMDI4WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9NDFhZmRiOGFkMTcwZGU1ZjE0ODQyYjBmNzU5ZmIyMzAyOWFiZmU1MjYxMjMyMzliYjczOWNkNDE3MTVlMmY5NiZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmYWN0b3JfaWQ9MCZrZXlfaWQ9MCZyZXBvX2lkPTAifQ.hlxeXswBV4LEL4SophqrjMcwkltjKt8ESPb8ZGvNnz4" controls="controls" style="max-width: 730px;"></video>


## Usage

1. **Build your bootc-enabled Containerfile:**

> In our example, we are going to change the root password for testing purposes when accessing the OS.

```Containerfile
FROM quay.io/centos-bootc/fedora-bootc:eln

# Change the root password
RUN echo "root:supersecret" | chpasswd
```

<video src="https://private-user-images.githubusercontent.com/6422176/297533864-566d6e9c-e28d-44d8-b6c6-e5b2b9c1c754.mp4?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MDU1MzAzNTksIm5iZiI6MTcwNTUzMDA1OSwicGF0aCI6Ii82NDIyMTc2LzI5NzUzMzg2NC01NjZkNmU5Yy1lMjhkLTQ0ZDgtYjZjNi1lNWIyYjljMWM3NTQubXA0P1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI0MDExNyUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNDAxMTdUMjIyMDU5WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9ZDczOWIyNGIyY2NjZWRjN2ZlOTcyYWEyMjdhMGVjMjRhYTdiYTZkNmU1NjhlMDZiOTZhZjNlOGY2MjM0MmI5MiZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmYWN0b3JfaWQ9MCZrZXlfaWQ9MCZyZXBvX2lkPTAifQ.MLJn71nofwBMQjDAfd9IziYnZEaBvZHNbByDwTiyX3Y" controls="controls" style="max-width: 730px;"></video>

2. **Push the image:**

> IMPORTANT NOTE: This must be a **PUBLICALLY** accessible registry, this will be fixed in the future to use a local container storage

<video src="https://private-user-images.githubusercontent.com/6422176/297533869-f90585e6-8c32-430a-9af7-ae1a8a00276b.mp4?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MDU1MzAzNTksIm5iZiI6MTcwNTUzMDA1OSwicGF0aCI6Ii82NDIyMTc2LzI5NzUzMzg2OS1mOTA1ODVlNi04YzMyLTQzMGEtOWFmNy1hZTFhOGEwMDI3NmIubXA0P1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI0MDExNyUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNDAxMTdUMjIyMDU5WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9OWQ0OTE1ZGY4Y2ExNTU1ZjcxZTgzNjU5NDA4YWEwNjFkYWJjYmJhYmM0MGI2YzE2ZDgyYjZjMGQwY2VkMDAwNCZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmYWN0b3JfaWQ9MCZrZXlfaWQ9MCZyZXBvX2lkPTAifQ.LEjr1maD8DVoA_Ru7DGe6U30LtEOLu7aaP5aIk9hiUE" controls="controls" style="max-width: 730px;"></video>

3. **Build the image:**

> Build the disk image, this takes approximatley 2-5 minutes depending on the performance of your machine.

<video src="https://private-user-images.githubusercontent.com/6422176/297533873-c3856bd6-481c-4b9c-b32e-2ff4d6d2e9db.mp4?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MDU1MzAzNTksIm5iZiI6MTcwNTUzMDA1OSwicGF0aCI6Ii82NDIyMTc2LzI5NzUzMzg3My1jMzg1NmJkNi00ODFjLTRiOWMtYjMyZS0yZmY0ZDZkMmU5ZGIubXA0P1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI0MDExNyUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNDAxMTdUMjIyMDU5WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9Y2U3MGE5ZjQ4M2I5OWNmMDkwMjFmNmExNjlmODM2Njc1NTNiMDkwNDgwODhhNDFiMzM4OTNiMmVhOWNjN2E4OCZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmYWN0b3JfaWQ9MCZrZXlfaWQ9MCZyZXBvX2lkPTAifQ.24DH9WNaotl5Q_O4ue1pRqoA5OGellwF3v0DiTnZ8ME" controls="controls" style="max-width: 730px;"></video>

4. **View the logs:**

> You can now view the conversion process within the Containers section

<video src="https://private-user-images.githubusercontent.com/6422176/297533877-f7c4bd3c-7584-4ed2-917f-e34e3482e299.mp4?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MDU1MzAzNTksIm5iZiI6MTcwNTUzMDA1OSwicGF0aCI6Ii82NDIyMTc2LzI5NzUzMzg3Ny1mN2M0YmQzYy03NTg0LTRlZDItOTE3Zi1lMzRlMzQ4MmUyOTkubXA0P1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI0MDExNyUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNDAxMTdUMjIyMDU5WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9NzAzNGY3MTI0MmFjZmQyMDJhMTQyMGQxYTcxNjkzYWIxNzY0YTIzYjc0ZmI5NDdhYjhiYWJlYmQ4NjI3NjNkMiZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmYWN0b3JfaWQ9MCZrZXlfaWQ9MCZyZXBvX2lkPTAifQ.4JpKFsOusJTFmHg5nt1mmpw2A08v4MwgEIExwbVJeJw" controls="controls" style="max-width: 730px;"></video>

5. **Launch the VM (experimental):**

> You can press the "Launch VM" button to test the virtual machine.

<video src="https://private-user-images.githubusercontent.com/6422176/297533879-4b151c61-431d-4ca9-8c92-66b831005b0a.mp4?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MDU1MzAzNTksIm5iZiI6MTcwNTUzMDA1OSwicGF0aCI6Ii82NDIyMTc2LzI5NzUzMzg3OS00YjE1MWM2MS00MzFkLTRjYTktOGM5Mi02NmI4MzEwMDViMGEubXA0P1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI0MDExNyUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNDAxMTdUMjIyMDU5WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9NzZmZDZkMDkzZWZlZWU0ZTRkNmVlNGNhNjRkYTAxNWJhMDY5MWJkMDRlYWI4OWYwNWM2ZDJmNTJhNWQwMDcwZiZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmYWN0b3JfaWQ9MCZrZXlfaWQ9MCZyZXBvX2lkPTAifQ.0f8hFJLPbuV-YyvtoXHYVC7R8jUQwtYVhQo9U1uAoQs" controls="controls" style="max-width: 730px;"></video>

# Development & Contribution

Want to help develop and contribute to the bootc extension?

You can use `yarn watch --extension-folder` from the Podman Desktop directory to automatically rebuild and test the bootc extension:

```sh
git clone https://github.com/containers/podman-desktop
git clone https://github.com/containers/podman-desktop-extension-bootc
cd podman-desktop
yarn watch --extension-folder ../podman-desktop-extension-bootc
```