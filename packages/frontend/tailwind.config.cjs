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
const tailwindColors = require('tailwindcss/colors')
const tailwindTypography = require('@tailwindcss/typography')

module.exports = {
  content: [
    'index.html',
    'src/**/*.{svelte,ts,css}',
    '../../node_modules/@podman-desktop/ui-svelte/src/**/*.{svelte,ts,css}',
  ],
  darkMode: 'class',
  theme: {
    fontSize: {
      'xs': '10px',
      'sm': '11px',
      'base': '12px',
      'lg': '14px',
      'xl': '16px',
      '2xl': '18px',
      '3xl': '20px',
      '4xl': '24px',
      '5xl': '30px',
      '6xl': '36px',
    },
    colors: {
      'charcoal': {
        600: '#27272a',
        800: '#18181b',
      },
      'gray': {
        400: '#d1d1d1',
        700: '#aaabac',
        900: '#818181',
      },
      'purple': {
        400: '#ad8bfa',
        500: '#8b5cf6',
      },
      'sky': {
        400: '#51a2da',
      },
      'green': {
        600: '#2b7037',
      },
      'red': {
        600: '#e5421d',
      },
      'amber': {
        600: tailwindColors.amber[600],
      },
      transparent: 'transparent',
      black: '#000',
      white: '#fff',
      // The remaining colors below are not part of our palette and are only here
      // to maintain existing code. No new use.
      'violet': {
        500: tailwindColors.violet[500],
        600: tailwindColors.violet[600],
      },
    },
  },
  plugins: [
    tailwindTypography
  ],
};
