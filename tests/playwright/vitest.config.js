/**********************************************************************
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
 ***********************************************************************/

const config = {
  test: {
    globals: true,
    /**
     * By default, vitest search test files in all packages.
     * For e2e tests have sense search only is project root tests folder
     */
    include: ['**/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/builtin/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp,cdix}/**',
      '**/{.electron-builder,babel,changelog,docusaurus,jest,postcss,prettier,rollup,svelte,tailwind,vite,vitest*,webpack}.config.*',
    ],

    /**
     * A default timeout of 5000ms is sometimes not enough for playwright.
     */
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // test reporters - default for all and junit for CI
    reporters: process.env.CI ? ['default', 'junit'] : ['verbose'],
    outputFile: process.env.CI ? { junit: '../output/junit-results.xml' } : {},
  },
};

export default config;
