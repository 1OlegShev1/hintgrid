import { test, expect, Page } from '@playwright/test';

/**
 * Helper to trigger clean Firebase disconnect and leave room.
 * Called before page/test ends to ensure proper cleanup.
 */
async function cleanupPage(page: Page): Promise<void> {
  try {
    // Trigger goOffline for immediate Firebase disconnect
    await page.evaluate(() => {
      if (typeof window !== 'undefined' && window.__hintgrid_goOffline) {
        window.__hintgrid_goOffline();
      }
    }).catch(() => {});
    
    // Click leave button if visible
    const leaveBtn = page.getByTestId('leave-room-btn');
    if (await leaveBtn.isVisible().catch(() => false)) {
      await leaveBtn.click().catch(() => {});
    }
    
    // Wait for disconnect to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch {
    // Ignore cleanup errors
  }
}

test.describe('Smoke Tests', () => {
  test('home page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check title and main elements using specific selectors
    await expect(page.getByRole('heading', { name: 'HintGrid' })).toBeVisible();
    await expect(page.getByTestId('home-name-input')).toBeVisible();
    await expect(page.getByTestId('home-create-btn')).toBeVisible();
    await expect(page.getByTestId('home-join-btn')).toBeVisible();
  });

  test('can create a room', async ({ page }) => {
    await page.goto('/');
    
    // Enter name and create room
    await page.getByTestId('home-name-input').fill('TestPlayer');
    await page.getByTestId('home-create-btn').click();
    
    // Should redirect to room page
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]+/);
    
    // Room should load with lobby visible - use data-testid for reliability
    await expect(page.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('lobby-join-blue-clueGiver')).toBeVisible();
    
    // Cleanup
    await cleanupPage(page);
  });

  test('can join existing room with code', async ({ browser }) => {
    // IMPORTANT: Each player needs a SEPARATE browser context for unique Firebase Auth
    // Using context.newPage() would share IndexedDB = same Firebase UID = same player!
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // First player creates room
      await page.goto('/');
      await page.getByTestId('home-name-input').fill('Player1');
      await page.getByTestId('home-create-btn').click();
      
      // Wait for navigation and get room code from URL
      await expect(page).toHaveURL(/\/room\/[A-Z0-9]+/);
      const url = page.url();
      const roomCode = url.match(/\/room\/([A-Z0-9]+)/)?.[1];
      expect(roomCode).toBeTruthy();
      
      // Wait for lobby to load
      await expect(page.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 10000 });
      
      // Second player joins with code (separate context = separate Firebase Auth)
      await page2.goto('/');
      await page2.getByTestId('home-name-input').fill('Player2');
      await page2.getByTestId('home-code-input').fill(roomCode!);
      await page2.getByTestId('home-join-btn').click();
      
      // Should be in same room (URL may have query params)
      await expect(page2).toHaveURL(new RegExp(`/room/${roomCode}`));
      await expect(page2.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 10000 });
      
      // Player1 should see Player2 joined - use the data-testid from TeamLobby's player cards
      await expect(page.getByTestId('lobby-player-Player2')).toBeVisible({ timeout: 10000 });
    } finally {
      // Cleanup both contexts
      await cleanupPage(page2);
      await cleanupPage(page);
      await context2.close();
      await context1.close();
    }
  });
});
