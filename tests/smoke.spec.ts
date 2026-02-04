import { test, expect } from '@playwright/test';
import {
  cleanupContexts,
  createMultipleContexts,
  createRoomAndWaitForLobby,
  joinRoomAndWaitForLobby,
  testPlayerName,
} from './test-utils';

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
    await page.getByTestId('home-name-input').fill(testPlayerName('TestPlayer'));
    await page.getByTestId('home-create-btn').click();
    
    // Should redirect to room page
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]+/);
    
    // Room should load with lobby visible - use data-testid for reliability
    await expect(page.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('lobby-join-blue-clueGiver')).toBeVisible();
  });

  test('can join existing room with code', async ({ browser }) => {
    const { contexts, pages } = await createMultipleContexts(browser, 2, 500);
    const [page1, page2] = pages;
    const playerNames = ['Player1', 'Player2'].map((name) => testPlayerName(name));

    try {
      // First player creates room
      const roomCode = await createRoomAndWaitForLobby(page1, playerNames[0]);
      
      // Second player joins with code (separate context for unique auth)
      await joinRoomAndWaitForLobby(page2, roomCode, playerNames[1]);
      
      // Should be in same room (URL may have query params)
      await expect(page2).toHaveURL(new RegExp(`/room/${roomCode}`));
      
      // Player1 should see Player2 joined (use exact match to avoid matching "Player2 (you)")
      await expect(page1.getByText(playerNames[1], { exact: true })).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupContexts(contexts);
    }
  });
});
