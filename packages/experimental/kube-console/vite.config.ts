//
// Copyright 2022 DXOS.org
//

// import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePluginFonts } from 'vite-plugin-fonts';
import mkcert from 'vite-plugin-mkcert';

import { ThemePlugin } from '@dxos/react-components/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

// @ts-ignore
// NOTE: Vite requires uncompiled JS.
import { osThemeExtension, consoleThemeExtension } from './theme-extensions';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

/**
 * https://vitejs.dev/config
 */
export default defineConfig({
  server: {
    host: true,
    https: process.env.HTTPS === 'true'
  },

  build: {
    sourcemap: true
  },

  plugins: [
    mkcert(),

    ConfigPlugin({
      env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY', 'DX_VAULT']
    }),

    // Directories to scan for Tailwind classes.
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-components/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs')
      ],
      extensions: [osThemeExtension, consoleThemeExtension]
    }),

    ReactPlugin(),

    /**
     * Bundle fonts.
     * https://fonts.google.com
     * https://www.npmjs.com/package/vite-plugin-fonts
     */
    VitePluginFonts({
      google: {
        injectTo: 'head-prepend',
        families: ['Roboto', 'Roboto Mono', 'DM Sans', 'DM Mono', 'Montserrat']
      },

      custom: {
        preload: true,
        injectTo: 'head-prepend',
        families: [
          {
            name: 'Sharp Sans',
            src: './node_modules/@dxos/react-icons/assets/fonts/sharp-sans/*.ttf'
          }
        ]
      }
    }),

    // TODO(burdon): Disabled due to permissions issue.
    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    /*
    ...(process.env.NODE_ENV === 'production'
      ? [
          sentryVitePlugin({
            org: 'dxos',
            project: 'console',
            include: './out/console',
            authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN
          })
        ]
      : []),
    */

    // https://www.bundle-buddy.com/rollup
    {
      name: 'bundle-buddy',
      buildEnd() {
        const deps: { source: string; target: string }[] = [];
        for (const id of this.getModuleIds()) {
          const m = this.getModuleInfo(id);
          if (m != null && !m.isExternal) {
            for (const target of m.importedIds) {
              deps.push({ source: m.id, target });
            }
          }
        }

        const outDir = join(__dirname, 'out');
        if (!existsSync(outDir)) {
          mkdirSync(outDir);
        }
        writeFileSync(join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
      }
    }
  ]
});