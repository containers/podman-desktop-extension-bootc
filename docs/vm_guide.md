# Virtual Machine Guide

## Introduction

At the moment we do not integrate a "one-click" solution to test your virtual machine image.

However, we provide some detailed instructions on how to run this on different operating systems.

## Usage

## macOS (Silicon)

The easiest solution to run this on macOS is by using [vfkit](https://github.com/crc-org/vfkit) which uses the native Apple hypervisor framework.

NOTE: This will only run NATIVE architecture images. Your image must use the ARM64 output.

### Installation

This can be installed via:

```
brew tap cfergeau/crc
brew install vfkit
```

Once installed, you can launch your image via these command line parameters:

```sh
# Change to your VM image location
export DISK_IMAGE=/Users/myusername/bootc/image/disk.raw

# Launch VFkit
vfkit --cpus 2 --memory 2048 \
    --bootloader efi,variable-store=./efi-variable-store,create \
    --device virtio-blk,path=$DISK_IMAGE \
    --device virtio-serial,stdio \
    --device virtio-net,nat,mac=72:20:43:d4:38:62 \
    --device virtio-rng \
    --device virtio-input,keyboard \
    --device virtio-input,pointing \
    --device virtio-gpu,width=1920,height=1080 \
    --gui
```

## Windows

TODO

## Linux

TODO