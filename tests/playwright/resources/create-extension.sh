: '/**********************************************************************
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/'

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
