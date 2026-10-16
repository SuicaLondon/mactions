import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import license from 'rollup-plugin-license';
import { defineConfig } from 'vite';

const backendOrigin = `http://127.0.0.1:${process.env.MACTIONS_DEV_PORT ?? '8787'}`;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Production builds list the licenses of every package bundled into the assets, and fail on
    // a license that is not allowed here.
    license({
      thirdParty: {
        allow: {
          test: '(Apache-2.0 OR BSD-3-Clause OR ISC OR MIT)',
          failOnUnlicensed: true,
          failOnViolation: true,
        },
        output: path.join(import.meta.dirname, '../dist/licenses/FRONTEND-LICENSES.txt'),
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: backendOrigin,
        changeOrigin: true,
        // Rust checks same-origin mutations. Only the local development proxy rewrites it.
        configure(proxy) {
          proxy.on('proxyReq', (request) => {
            request.setHeader('Origin', backendOrigin);
          });
        },
      },
    },
  },
});
