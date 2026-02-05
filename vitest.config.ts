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
    include: ['**/__tests__/**/*.test.ts'],
    // Separate configs for unit and integration tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__tests__/**/*.integration.test.ts', // Exclude integration tests from default run
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['shared/**/*.ts', 'lib/**/*.ts'],
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        'lib/firebase*.ts',
        'lib/__tests__/setup/**', // Exclude test utilities
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
