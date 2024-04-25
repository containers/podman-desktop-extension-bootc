# Virtual Machine Guide

## Introduction

At the moment we do not integrate a "one-click" solution to test your virtual machine image.

Consider trying [podman-bootc CLI](https://gitlab.com/bootc-org/podman-bootc-cli) for this.

However, we provide some detailed instructions on how to run this on different operating systems.

## Usage

## macOS (Silicon)

### ARM64 (qemu)

[qemu](https://www.qemu.org/) which emulates the architecture.

**Installation:**

```
brew install qemu
```

**Usage:**

**Important note:** Assuming you are running the example application, the command will port forward local port 8080 to 80. This can be changed in the below `qemu` command.

1. Build a RAW image
2. Run the following command:
```sh
# Change to your VM image location
export DISK_IMAGE=/Users/myusername/bootc/image/disk.raw

# Run the qemu command
# note the 8080:80 port forwarding
qemu-system-aarch64 \
    -m 8G \
    -M virt \
    -accel hvf \
    -cpu host \
    -smp 4 \
    -serial mon:stdio \
    -nographic \
    -netdev user,id=usernet,hostfwd=tcp::8080-:80 \
    -device virtio-net,netdev=usernet \
    -drive file=/opt/homebrew/share/qemu/edk2-aarch64-code.fd,format=raw,if=pflash,readonly=on \
    -drive file=$DISK_IMAGE,if=virtio,cache=writethrough,format=raw
```
3. `curl` your local port to check VM access `curl localhost:8080`
4. To exit the terminal, type: `Ctrl+a` then `x`

### ARM64 (vfkit)

[vfkit](https://github.com/crc-org/vfkit) which uses the native Apple hypervisor framework.

NOTE: This will only run NATIVE architecture images. Your image must use the ARM64 output.

**Installation:**

```
brew tap cfergeau/crc
brew install vfkit
```

**Usage:**

1. Build a RAW image
2. Run the following command:
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


### x86_64 / AMD64 (qemu)

[qemu](https://www.qemu.org/) which emulates the architecture.


**Installation:**

```
brew install qemu
```

**Usage:**

**Important note:** Assuming you are running the example application, the command will port forward local port 8080 to 80. This can be changed in the below `qemu` command.

1. Build a RAW image
2. Run the following command:
```sh
# Change to your VM image location
export DISK_IMAGE=/Users/myusername/bootc/image/disk.raw

# Run the qemu command
# note the 8080:80 port forwarding
qemu-system-x86_64 \
    -m 8G \
    -cpu Broadwell-v4 \
    -nographic \
    -netdev user,id=usernet,hostfwd=tcp::8080-:80 \
    -device virtio-net,netdev=usernet \
    -snapshot $DISK_IMAGE
```
3. `curl` your local port to check VM access `curl localhost:8080`
4. To exit the terminal, type: `Ctrl+a` then `x`


## Windows

TODO

## Linux

TODO
