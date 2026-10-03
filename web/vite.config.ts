import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const backendOrigin = `http://127.0.0.1:${process.env.MACTIONS_DEV_PORT ?? '8787'}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
