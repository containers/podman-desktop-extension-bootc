# Virtual Machine Launcher

Virtual Machine support is **experimental** and is only meant to run *one VM at a time* within the BootC extension.

We launch the virtual machine by using QEMU.

There are some caveats however:
- The virtual machine is booted as a snapshot and writes data to a /tmp file. The .raw file will remain unmodified. All changes are discarded on shut down.
- VM is shutdown when changing to another page.
- Port 22 is forwarded to 2222 locally for SSH testing. The VM may be accessed by using ssh localhost -p 2222 on an external terminal.
- VM uses 4GB of RAM by default.

## Installation

### macOS

Install QEMU on macOS by running the following with `brew`:

```sh
brew install qemu
```

### Linux

Install QEMU by [following the QEMU guide for your distribution](https://www.qemu.org/download/#linux).