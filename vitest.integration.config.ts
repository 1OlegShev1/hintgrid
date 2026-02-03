import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.integration.test.ts'],
    testTimeout: 30000, // Integration tests may take longer
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/rtdb-actions.ts'],
      exclude: ['**/__tests__/**', '**/node_modules/**'],
    },
  },
});
