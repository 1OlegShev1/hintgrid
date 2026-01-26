import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration.
 * 
 * Run against local dev server (default):
 *   npm run test:e2e
 * 
 * Run against deployed Firebase app:
 *   BASE_URL=https://clue-cards.web.app npm run test:e2e
 * 
 * See https://playwright.dev/docs/test-configuration
 */

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const isDeployed = baseURL.startsWith('https://');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
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
