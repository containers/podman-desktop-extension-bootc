/**********************************************************************
 * Copyright (C) 2023 Red Hat, Inc.
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
 ***********************************************************************/

import path from 'node:path';
import { join } from 'path';

const PACKAGE_ROOT = __dirname;

const config = {
  test: {
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)', '../shared/**/*.{test,spec}.?(c|m)[jt]s?(x)']
  },
  resolve: {
    alias: {
      '@podman-desktop/api': path.resolve(__dirname, '__mocks__/@podman-desktop/api.js'),
      '/@/': join(PACKAGE_ROOT, 'src') + '/',
    },
  },
};

export default config;
