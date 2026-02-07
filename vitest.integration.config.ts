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
    fileParallelism: false, // Files share one emulator DB; run sequentially to avoid cleanup conflicts
    testTimeout: 30000, // Integration tests may take longer
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      experimentalAstAwareRemapping: true,
      reporter: ['text', 'html'],
      include: ['lib/rtdb/**/*.ts'],
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        'lib/rtdb/index.ts', // Barrel file, no logic to cover
      ],
      thresholds: {
        statements: 75,
        branches: 65,
        functions: 70,
        lines: 80,
      },
    },
  },
});
