# Disk Image Guide

## Introduction

Below is information on how you can deploy your image after building.

There are **many** solutions to deploy a virtual machine image and this document does not encompass all of them.

## General Solutions

* `qcow`: QEMU is the primary software that utilizes both the QCOW and QCOW2 formats. These formats allow you to create, manage, and run virtual machines with features like better performance and snapshot capabilities. [QEMU](https://www.qemu.org/).
* `raw`: The raw image format is widely supported across many virtualization tools and cloud server providers. Software like KVM, VMware, and cloud platforms including AWS and Azure can utilize raw images. Libvirt, often used with KVM, also supports raw images extensively. [Libvirt](https://libvirt.org/).
* `iso`: BalenaEtcher is recommended for writing ISO files to storage devices to create bootable media. It's user-friendly and cross-platform. [Download balenaEtcher](https://www.balena.io/etcher/).
* `vmdk`: VMware Workstation and VMware ESXi are two prominent platforms that support the VMDK format. They provide comprehensive tools for running and managing virtual machines. [VMware Workstation](https://www.vmware.com/products/workstation-pro.html), [VMware ESXi](https://www.vmware.com/products/esxi-and-esx.html).
* `ami`: Amazon EC2 uses the AMI format to launch new virtual servers. You can manage AMIs using Amazon's own tools like AWS Management Console. [Amazon EC2](https://aws.amazon.com/ec2/).

## Recommended Development & Testing

## Development on macOS (Silicon)

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