# Bootable Container Extension

This extension provides support for bootable containers (bootc and image builder)
to Podman Desktop.

# Features

- Adds a badge to all bootable containers (currently looks for the
  'ostree.bootable' label, but this will change).
- Adds a custom icon to all bootable containers.
- Adds a menu item to bootable containers to launch image builder to create
  a disk image.

# How to test/develop

To run in development mode, clone Podman Desktop and this repo. Follow the
Podman Desktop instructions on launching in dev mode, but add the path to
this extension:

`yarn watch --extension-folder ~/git/projectatomic/bootc-extension`
