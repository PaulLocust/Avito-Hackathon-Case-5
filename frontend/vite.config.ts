import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Цель прокси /api. Для демо без бэкенда можно направить на мок Prism:
// VITE_API_PROXY_TARGET=http://localhost:4010 npm run dev (см. README).
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiProxyTarget,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15_000,
  },
});
