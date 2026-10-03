import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    // Bound DOM-heavy test concurrency on development machines.
    maxWorkers: 2,
    setupFiles: ['./src/test/setup.ts'],
  },
});
