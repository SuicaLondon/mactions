import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        // Rust checks same-origin mutations. Only the local development proxy rewrites it.
        configure(proxy) {
          proxy.on('proxyReq', request => {
            request.setHeader('Origin', 'http://127.0.0.1:8787');
          });
        },
      },
    },
  },
});
