#!/bin/bash

extensionFolder=bootcextensionlocal

yarn build
mkdir -p $extensionFolder
cp -r packages/backend/dist/ $extensionFolder/dist
cp packages/backend/package.json $extensionFolder/
cp -r packages/backend/media/ $extensionFolder/media
cp LICENSE $extensionFolder/
cp packages/backend/icon-dark.png $extensionFolder/
cp packages/backend/icon-light.png $extensionFolder/
cp packages/backend/bootable.woff2 $extensionFolder/
cp README.md $extensionFolder/

# we need to move the folder with extension content into right podman desktop home folder
mkdir -p tests/playwright/tests/output/bootc-tests-pd/plugins
cp -r $extensionFolder tests/playwright/tests/output/bootc-tests-pd/plugins
