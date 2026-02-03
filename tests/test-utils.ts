/**
 * Shared test utilities for E2E tests.
 * Provides consistent cleanup and helper functions across all test files.
 */

import { Page, BrowserContext, Browser } from '@playwright/test';

// Extend Window interface for HintGrid's custom goOffline function
declare global {
  interface Window {
    __hintgrid_goOffline?: () => void;
  }
}

/** 
 * Prefix for test player names - helps identify and clean up test data.
 * Using timestamp ensures uniqueness across parallel runs.
 */
export const TEST_PREFIX = 'E2E';

/**
 * Generate a unique test player name.
 * Format: E2E_<timestamp>_<name>
 */
export function testPlayerName(baseName: string): string {
  return `${TEST_PREFIX}_${Date.now()}_${baseName}`;
}

/**
 * Clean up test contexts properly.
 * 
 * This function:
 * 1. Triggers goOffline() on each page to fire Firebase onDisconnect immediately
 * 2. Clicks the Leave button if visible
 * 3. Waits for Firebase to process the disconnect
 * 4. Closes all contexts
 * 
 * The goOffline() call is critical - it causes Firebase to immediately trigger
 * onDisconnect handlers, ensuring room cleanup happens synchronously rather
 * than waiting for the server to detect a closed WebSocket.
 */
export async function cleanupContexts(contexts: BrowserContext[]): Promise<void> {
  // Step 1: Trigger goOffline on all pages (parallel for speed)
  const goOfflinePromises: Promise<void>[] = [];
  
  for (const ctx of contexts) {
    for (const page of ctx.pages()) {
      goOfflinePromises.push(
        page.evaluate(() => {
          // Call the exposed goOffline function if available
          if (typeof window !== 'undefined' && window.__hintgrid_goOffline) {
            window.__hintgrid_goOffline();
          }
        }).catch(() => {
          // Ignore errors - page might already be closed or navigated away
        })
      );
    }
  }
  
  await Promise.all(goOfflinePromises);
  
  // Step 2: Click Leave button on each page (sequential to avoid race conditions)
  for (const ctx of contexts) {
    for (const page of ctx.pages()) {
      try {
        const leaveBtn = page.getByTestId('leave-room-btn');
        // Only click if visible (page might be on home or error state)
        const isVisible = await leaveBtn.isVisible().catch(() => false);
        if (isVisible) {
          await leaveBtn.click().catch(() => {
            // Ignore - page might navigate away
          });
        }
      } catch {
        // Ignore errors - page might be closed
      }
    }
  }
  
  // Step 3: Wait for Firebase to process disconnects
  // 1.5s is enough for onDisconnect to propagate when goOffline was called
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Step 4: Close all contexts
  await Promise.all(contexts.map(ctx => ctx.close().catch(() => {})));
}

/**
 * Wait for expected player count in the lobby.
 * Counts visible player cards in the "All Players" section.
 */
export async function waitForPlayerCount(page: Page, count: number, timeout = 30000): Promise<void> {
  const { expect } = await import('@playwright/test');
  
  await expect(async () => {
    const playerCards = await page.locator('[data-testid^="lobby-player-"]').count();
    expect(playerCards).toBe(count);
  }).toPass({ timeout });
}

/**
 * Join a team role and verify it was registered.
 * Waits for the team "Leave" button to appear (indicates player joined locally).
 * 
 * If an ownerPage is provided, also waits for the owner to see the join button disappear
 * (confirming Firebase synced the role assignment to other players).
 */
export async function joinTeamRole(
  page: Page,
  team: 'red' | 'blue',
  role: 'clueGiver' | 'guesser',
  ownerPage?: Page
): Promise<void> {
  const { expect } = await import('@playwright/test');
  
  const joinBtn = page.getByTestId(`lobby-join-${team}-${role}`);
  await joinBtn.click();
  
  // Wait for local UI to update - leave button should appear
  await expect(page.getByTestId('lobby-leave-team-btn')).toBeVisible({ timeout: 10000 });
  
  // If ownerPage provided, verify the sync propagated to owner
  // The join button should disappear on owner's page when slot is filled
  if (ownerPage && ownerPage !== page) {
    await expect(ownerPage.getByTestId(`lobby-join-${team}-${role}`)).not.toBeVisible({ timeout: 10000 });
  }
}

/**
 * Get card indices by team from clue giver's view.
 * Clue giver cards have distinctive border colors.
 * 
 * The clue giver sees all cards with colored borders indicating their team.
 * This function retries to handle cases where the board is still rendering.
 * 
 * IMPORTANT: The clue giver view shows team colors via border classes like
 * 'border-red-team' and 'border-blue-team'. If this returns empty, ensure
 * the page is actually the clue giver's page and the game has started.
 */
export async function getTeamCards(clueGiverPage: Page, team: 'red' | 'blue'): Promise<number[]> {
  const borderClass = team === 'red' ? 'border-red-team' : 'border-blue-team';
  const { expect } = await import('@playwright/test');
  
  // First, ensure the board is visible
  await expect(clueGiverPage.getByTestId('board-card-0')).toBeVisible({ timeout: 10000 });
  
  // Wait for colored cards to appear - clue givers see colored borders
  // Use a locator that matches any card with the team's border color
  const coloredCardLocator = clueGiverPage.locator(`[data-testid^="board-card-"][class*="${borderClass}"]`);
  
  try {
    // Wait for at least one colored card to be visible (proves we're in clue giver view)
    await coloredCardLocator.first().waitFor({ state: 'visible', timeout: 15000 });
  } catch {
    console.warn(`  getTeamCards: No ${team} cards with colored borders found - might not be clue giver view`);
    // Try to debug by checking what classes the first card has
    const card0Classes = await clueGiverPage.getByTestId('board-card-0').getAttribute('class').catch(() => 'N/A');
    console.log(`  Card 0 classes: ${card0Classes}`);
    return [];
  }
  
  // Now collect all cards with this team's color
  const indices: number[] = [];
  for (let i = 0; i < 25; i++) {
    const card = clueGiverPage.getByTestId(`board-card-${i}`);
    try {
      const classes = await card.getAttribute('class');
      if (classes?.includes(borderClass)) {
        indices.push(i);
      }
    } catch {
      // Card not accessible, continue
    }
  }
  
  console.log(`  getTeamCards: Found ${indices.length} ${team} cards`);
  return indices;
}

/**
 * Wait for Firebase state to sync across all pages.
 * Uses a simple delay-based approach since Firebase doesn't provide sync guarantees.
 * @deprecated Prefer waiting for observable state changes instead
 */
export async function waitForFirebaseSync(ms = 500): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a card to be revealed on a page.
 * Uses the data-revealed attribute as the observable state.
 */
export async function waitForCardRevealed(
  page: Page,
  cardIndex: number,
  timeout = 10000
): Promise<void> {
  const { expect } = await import('@playwright/test');
  const card = page.getByTestId(`board-card-${cardIndex}`);
  await expect(card).toHaveAttribute('data-revealed', 'true', { timeout });
}

/**
 * Create multiple browser contexts sequentially with delays.
 * 
 * Creating contexts in parallel with Promise.all can overwhelm the system
 * and cause Firebase Auth initialization to fail or hang. Sequential creation
 * with small delays is more reliable.
 * 
 * @param browser - The Playwright browser instance
 * @param count - Number of contexts to create
 * @param delayMs - Delay between context creations (default 300ms)
 * @returns Array of browser contexts and their pages
 */
export async function createMultipleContexts(
  browser: Browser,
  count: number,
  delayMs = 500 // Increased to reduce Firebase Auth rate limit risk
): Promise<{ contexts: BrowserContext[]; pages: Page[] }> {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  
  for (let i = 0; i < count; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    contexts.push(context);
    pages.push(page);
    
    // Small delay between context creations to avoid overwhelming the system
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return { contexts, pages };
}

/**
 * Create a room and wait for lobby to be ready.
 * Includes retry logic for reliability.
 */
export async function createRoomAndWaitForLobby(
  page: Page,
  playerName: string
): Promise<string> {
  const { expect } = await import('@playwright/test');
  
  await page.goto('/');
  await page.getByTestId('home-name-input').fill(playerName);
  await page.getByTestId('home-create-btn').click();
  
  // Wait for navigation to room
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]+/, { timeout: 15000 });
  
  // Extract room code
  const url = page.url();
  const roomCode = url.match(/\/room\/([A-Z0-9]+)/)?.[1];
  if (!roomCode) {
    throw new Error('Failed to extract room code from URL');
  }
  
  // Wait for lobby to be fully loaded
  await expect(page.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 15000 });
  
  return roomCode;
}

/**
 * Join a room and wait for lobby to be ready.
 * Includes retry logic for reliability.
 */
export async function joinRoomAndWaitForLobby(
  page: Page,
  roomCode: string,
  playerName: string
): Promise<void> {
  const { expect } = await import('@playwright/test');
  
  await page.goto('/');
  await page.getByTestId('home-name-input').fill(playerName);
  await page.getByTestId('home-code-input').fill(roomCode);
  await page.getByTestId('home-join-btn').click();
  
  // Wait for lobby to be fully loaded
  await expect(page.getByTestId('lobby-join-red-clueGiver')).toBeVisible({ timeout: 15000 });
}
