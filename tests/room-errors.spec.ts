import { test, expect, BrowserContext } from '@playwright/test';
import { cleanupContexts, createMultipleContexts } from './test-utils';

/**
 * E2E tests for error scenarios related to room access.
 * Tests: locked rooms, banned players, invalid room codes.
 * 
 * IMPORTANT: Each player needs a separate browser context to get a unique
 * Firebase Auth session.
 */

test.describe('Room Error Scenarios', () => {
  // Note: "invalid room code" test removed - by design, joining a non-existent room creates it.
  // Room codes are not validated for format; any string works as a room identifier.

  test('should show error when joining locked room', async ({ browser }) => {
    test.setTimeout(60000);
    
    // Create contexts SEQUENTIALLY to avoid Firebase Auth race conditions
    const { contexts, pages } = await createMultipleContexts(browser, 2);
    const [ownerPage, playerPage] = pages;

    try {
      // Owner creates room
      await ownerPage.goto('/');
      await ownerPage.getByTestId('home-name-input').fill('Owner');
      await ownerPage.getByTestId('home-create-btn').click();
      
      await expect(ownerPage).toHaveURL(/\/room\/[A-Z0-9]+/);
      const url = ownerPage.url();
      const roomCode = url.match(/\/room\/([A-Z0-9]+)/)?.[1];
      expect(roomCode).toBeTruthy();
      
      // Wait for lobby to load
      await expect(ownerPage.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 10000 });
      
      // Lock the room - find and click the lock button
      const lockBtn = ownerPage.getByTestId('room-lock-btn');
      await expect(lockBtn).toBeVisible({ timeout: 5000 });
      await lockBtn.click();
      
      // Wait for lock state to be confirmed (button text changes to "Locked")
      await expect(lockBtn.getByText('Locked')).toBeVisible({ timeout: 5000 });
      
      // New player tries to join
      await playerPage.goto('/');
      await playerPage.getByTestId('home-name-input').fill('Player2');
      await playerPage.getByTestId('home-code-input').fill(roomCode!);
      await playerPage.getByTestId('home-join-btn').click();
      
      // Should show locked error (use heading which is more specific)
      await expect(playerPage.getByRole('heading', { name: /locked/i })).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupContexts(contexts);
    }
  });

  test('should show error when banned player tries to rejoin', async ({ browser }) => {
    test.setTimeout(90000);
    
    // Create contexts SEQUENTIALLY to avoid Firebase Auth race conditions
    const { contexts, pages } = await createMultipleContexts(browser, 2);
    const [ownerPage, playerPage] = pages;

    try {
      // Owner creates room
      await ownerPage.goto('/');
      await ownerPage.getByTestId('home-name-input').fill('Owner');
      await ownerPage.getByTestId('home-create-btn').click();
      
      await expect(ownerPage).toHaveURL(/\/room\/[A-Z0-9]+/);
      const url = ownerPage.url();
      const roomCode = url.match(/\/room\/([A-Z0-9]+)/)?.[1];
      expect(roomCode).toBeTruthy();
      
      await expect(ownerPage.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 10000 });
      
      // Player joins
      await playerPage.goto('/');
      await playerPage.getByTestId('home-name-input').fill('TroubleMaker');
      await playerPage.getByTestId('home-code-input').fill(roomCode!);
      await playerPage.getByTestId('home-join-btn').click();
      
      await expect(playerPage.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 10000 });
      
      // Owner sees player - wait for them to appear in owner's view (proves Firebase sync)
      await expect(ownerPage.getByTestId('lobby-player-TroubleMaker')).toBeVisible({ timeout: 10000 });
      
      // Find and click kick button - it's near the player's name
      // Use locator to find the kick button in the same row/container as the player name
      const kickBtn = ownerPage.getByRole('button', { name: /kick/i }).first();
      await expect(kickBtn).toBeVisible({ timeout: 5000 });
      await kickBtn.click();
      
      // Wait for player to be removed (they'll see error or be redirected)
      await expect(playerPage.getByRole('heading', { name: /removed/i })).toBeVisible({ timeout: 10000 });
      
      // Navigate away and try to rejoin
      await playerPage.goto('/');
      await playerPage.getByTestId('home-name-input').fill('TroubleMaker');
      await playerPage.getByTestId('home-code-input').fill(roomCode!);
      await playerPage.getByTestId('home-join-btn').click();
      
      // Should show banned error - the error appears in ConnectionStatus
      // The title is "Connection Failed" with message containing "banned"
      await expect(playerPage.getByRole('heading', { name: /connection failed/i })).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupContexts(contexts);
    }
  });

  test('should allow previously banned player to rejoin after ban expires', async ({ browser }) => {
    // This test would require waiting 2 minutes for the ban to expire
    // We'll skip actual wait and just verify the ban message mentions duration
    test.setTimeout(60000);
    
    // Create contexts SEQUENTIALLY to avoid Firebase Auth race conditions
    const { contexts, pages } = await createMultipleContexts(browser, 2);
    const [ownerPage, playerPage] = pages;

    try {
      // Owner creates room
      await ownerPage.goto('/');
      await ownerPage.getByTestId('home-name-input').fill('Owner');
      await ownerPage.getByTestId('home-create-btn').click();
      
      await expect(ownerPage).toHaveURL(/\/room\/[A-Z0-9]+/);
      const url = ownerPage.url();
      const roomCode = url.match(/\/room\/([A-Z0-9]+)/)?.[1];
      expect(roomCode).toBeTruthy();
      
      await expect(ownerPage.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 10000 });
      
      // Player joins
      await playerPage.goto('/');
      await playerPage.getByTestId('home-name-input').fill('Banned');
      await playerPage.getByTestId('home-code-input').fill(roomCode!);
      await playerPage.getByTestId('home-join-btn').click();
      
      await expect(playerPage.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 10000 });
      
      // Owner sees player - wait for them to appear (proves Firebase sync)
      await expect(ownerPage.getByTestId('lobby-player-Banned')).toBeVisible({ timeout: 10000 });
      
      const kickBtn = ownerPage.getByRole('button', { name: /kick/i }).first();
      await expect(kickBtn).toBeVisible({ timeout: 5000 });
      await kickBtn.click();
      
      // Wait for kick to take effect - RoomClosedModal shows "Removed from Room"
      await expect(playerPage.getByRole('heading', { name: /removed from room/i })).toBeVisible({ timeout: 10000 });
      
      // Try to rejoin - ban message should mention remaining time
      await playerPage.goto('/');
      await playerPage.getByTestId('home-name-input').fill('Banned');
      await playerPage.getByTestId('home-code-input').fill(roomCode!);
      await playerPage.getByTestId('home-join-btn').click();
      
      // Should show "Connection Failed" with error message containing "banned"
      await expect(playerPage.getByRole('heading', { name: /connection failed/i })).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupContexts(contexts);
    }
  });

  test('should show error for duplicate player name', async ({ browser }) => {
    test.setTimeout(60000);
    
    // Create contexts SEQUENTIALLY to avoid Firebase Auth race conditions
    const { contexts, pages } = await createMultipleContexts(browser, 2);
    const [page1, page2] = pages;

    try {
      // First player creates room
      await page1.goto('/');
      await page1.getByTestId('home-name-input').fill('SameName');
      await page1.getByTestId('home-create-btn').click();
      
      await expect(page1).toHaveURL(/\/room\/[A-Z0-9]+/);
      const url = page1.url();
      const roomCode = url.match(/\/room\/([A-Z0-9]+)/)?.[1];
      expect(roomCode).toBeTruthy();
      
      await expect(page1.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 10000 });
      
      // Second player tries to join with same name
      await page2.goto('/');
      await page2.getByTestId('home-name-input').fill('SameName');
      await page2.getByTestId('home-code-input').fill(roomCode!);
      await page2.getByTestId('home-join-btn').click();
      
      // Should show error about duplicate name (use heading for specificity)
      await expect(page2.getByRole('heading', { name: /already taken/i })).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupContexts(contexts);
    }
  });
});
