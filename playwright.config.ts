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

// Longer timeouts for deployed environments due to network latency
const deployedTimeouts = {
  // Total test timeout: 3 minutes for deployed, default for local
  timeout: isDeployed ? 180000 : undefined,
  // Individual expect() assertions: 15s for deployed, 5s for local
  expect: { timeout: isDeployed ? 15000 : 5000 },
  // Action timeouts (click, fill, etc.): 30s for deployed, 15s for local
  actionTimeout: isDeployed ? 30000 : 15000,
  // Navigation timeout: 60s for deployed, 30s for local
  navigationTimeout: isDeployed ? 60000 : 30000,
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Always retry once to handle transient network issues
  retries: process.env.CI ? 2 : 1,
  // Single worker for multiplayer tests to avoid resource contention
  workers: process.env.CI ? 1 : 1,
  reporter: 'html',
  
  // Apply timeout settings
  timeout: deployedTimeouts.timeout,
  expect: deployedTimeouts.expect,
  
  /* Clean up orphaned test rooms after all tests complete */
  globalTeardown: './tests/global-teardown.ts',
  
  use: {
    baseURL,
    trace: 'on-first-retry',
    actionTimeout: deployedTimeouts.actionTimeout,
    navigationTimeout: deployedTimeouts.navigationTimeout,
    // Video on failure helps debug flaky tests
    video: 'on-first-retry',
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
