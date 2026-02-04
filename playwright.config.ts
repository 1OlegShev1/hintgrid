import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration.
 * 
 * Run against local dev server (default):
 *   npm run test:e2e
 * 
 * Run against deployed Firebase app:
 *   BASE_URL=https://hintgrid.com npm run test:e2e
 * 
 * See https://playwright.dev/docs/test-configuration
 */

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const isDeployed = baseURL.startsWith('https://');
const workersEnv = process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : NaN;
const workers = Number.isFinite(workersEnv) && workersEnv > 0 ? workersEnv : 1;

export default defineConfig({
  testDir: './tests',
  // Avoid parallelism by default to reduce Firebase rate limiting on free tier.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // Always retry - Firebase rate limits are unpredictable
  retries: process.env.CI ? 2 : 1,
  workers,
  reporter: 'html',
  
  /* Clean up orphaned test rooms after all tests complete */
  globalTeardown: './tests/global-teardown.ts',
  
  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start Next.js dev server before tests (skip if testing deployed app) */
  ...(isDeployed ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  }),
});
