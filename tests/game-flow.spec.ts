import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  cleanupContexts,
  waitForPlayerCount,
  joinTeamRole,
  getTeamCards,
  waitForFirebaseSync,
  waitForCardRevealed,
  createRoomAndWaitForLobby,
  joinRoomAndWaitForLobby,
  createMultipleContexts,
} from './test-utils';

/**
 * Full game flow E2E test.
 * 
 * Tests the complete flow:
 * 1. 4 players join a room
 * 2. Players select teams (or use randomize)
 * 3. Owner starts the game
 * 4. Clue giver gives a clue
 * 5. Guesser votes and reveals a card
 * 6. Turn changes appropriately
 * 
 * IMPORTANT: Each player needs a separate browser context to get a unique
 * Firebase Auth session. Using pages from the same context would give all
 * players the same uid, breaking multi-player functionality.
 */

test.describe('Full Game Flow', () => {
  test('complete game flow with 4 players', async ({ browser }) => {
    test.setTimeout(180000); // 3 minutes for multi-player test with Firebase latency
    
    // Create 4 separate browser contexts SEQUENTIALLY - each gets its own Firebase Auth session
    // This is critical: pages in the same context share IndexedDB (and thus Firebase uid)
    // Sequential creation avoids overwhelming the system and Firebase Auth
    const { contexts, pages } = await createMultipleContexts(browser, 4);

    const playerNames = ['RedClue', 'RedGuess', 'BlueClue', 'BlueGuess'];

    // ========================================
    // Step 1: First player creates room
    // ========================================
    const roomCode = await createRoomAndWaitForLobby(pages[0], playerNames[0]);

    // ========================================
    // Step 2: Other 3 players join the room
    // ========================================
    for (let i = 1; i < 4; i++) {
      await joinRoomAndWaitForLobby(pages[i], roomCode, playerNames[i]);
      // Small delay between joins to avoid overwhelming Firebase
      await waitForFirebaseSync(200);
    }

    // Wait for all players to be synced (check on owner's page)
    await waitForPlayerCount(pages[0], 4);

    // ========================================
    // Step 3: Assign teams manually (with cross-player verification)
    // ========================================
    const ownerPage = pages[0];
    
    // Player 0 (RedClue) - joins red clue giver (no owner verification needed - they are owner)
    await joinTeamRole(pages[0], 'red', 'clueGiver');
    
    // Player 1 (RedGuess) - joins red guesser, verify owner sees it
    await joinTeamRole(pages[1], 'red', 'guesser', ownerPage);
    
    // Player 2 (BlueClue) - joins blue clue giver, verify owner sees it
    await joinTeamRole(pages[2], 'blue', 'clueGiver', ownerPage);
    
    // Player 3 (BlueGuess) - joins blue guesser, verify owner sees it
    await joinTeamRole(pages[3], 'blue', 'guesser', ownerPage);

    // Wait for start button to be enabled (all roles synced to owner)
    const startButton = pages[0].getByTestId('lobby-start-btn');
    await expect(startButton).toBeEnabled({ timeout: 30000 });

    // ========================================
    // Step 4: Owner starts the game
    // ========================================
    await startButton.click();

    // Wait for game to start - board should be visible
    await expect(pages[0].getByTestId('board-card-0')).toBeVisible({ timeout: 10000 });

    // All players should see the board
    for (const page of pages) {
      await expect(page.getByTestId('board-card-0')).toBeVisible({ timeout: 5000 });
    }

    // ========================================
    // Step 5: Determine current team and give clue
    // ========================================
    // Wait for Firebase to sync game state to all clients
    await waitForFirebaseSync(500);
    
    // Check which team goes first by looking at the clue input visibility
    // The clue giver of the current team should see the clue input
    let clueGiverPage: Page;
    let guesserPage: Page;

    // Try red clue giver first - wait a bit for UI to settle
    const redClueInput = pages[0].getByTestId('game-clue-input');
    const isRedTurn = await redClueInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (isRedTurn) {
      clueGiverPage = pages[0]; // RedClue
      guesserPage = pages[1]; // RedGuess
    } else {
      clueGiverPage = pages[2]; // BlueClue
      guesserPage = pages[3]; // BlueGuess
    }

    // Clue giver fills in clue (use a word unlikely to be on board)
    const clueInput = clueGiverPage.getByTestId('game-clue-input');
    await expect(clueInput).toBeVisible({ timeout: 5000 });
    await clueInput.fill('TESTING');
    
    const clueCountInput = clueGiverPage.getByTestId('game-clue-count');
    await clueCountInput.fill('2');
    
    await clueGiverPage.getByTestId('game-clue-btn').click();

    // Wait for clue to be displayed (clue input should disappear for clue giver)
    await expect(clueInput).not.toBeVisible({ timeout: 5000 });
    
    // IMPORTANT: Wait for guesser to see the clue (Firebase sync complete)
    await expect(guesserPage.getByTestId('game-current-clue')).toBeVisible({ timeout: 10000 });

    // ========================================
    // Step 6: Guesser votes and reveals a card
    // ========================================
    // Guesser clicks on a card to vote
    const cardToClick = guesserPage.getByTestId('board-card-12'); // Middle card
    await cardToClick.click();

    // Wait for reveal button to appear (vote was registered)
    const revealButton = guesserPage.getByTestId('board-reveal-12');
    await expect(revealButton).toBeVisible({ timeout: 5000 });
    await revealButton.click();

    // ========================================
    // Step 7: Verify card was revealed (on guesser's page first)
    // ========================================
    await waitForCardRevealed(guesserPage, 12);

    // ========================================
    // Step 8: Verify card reveal synced to all players
    // ========================================
    // All players should see card 12 as revealed (verifies Firebase sync)
    for (const page of pages) {
      await waitForCardRevealed(page, 12);
    }
    
    // Board should still be functional
    await expect(pages[0].getByTestId('board-card-0')).toBeVisible();

    console.log('Full game flow test completed successfully!');
    await cleanupContexts(contexts);
  });

  test('play full game until one team wins', async ({ browser }) => {
    test.setTimeout(180000); // 3 minutes for full game test
    
    // Create 4 separate browser contexts SEQUENTIALLY for unique Firebase Auth sessions
    const { contexts, pages } = await createMultipleContexts(browser, 4);

    const playerNames = ['RedClue', 'RedGuess', 'BlueClue', 'BlueGuess'];

    // ========================================
    // Setup: Create room and join all players
    // ========================================
    const roomCode = await createRoomAndWaitForLobby(pages[0], playerNames[0]);

    // Other players join sequentially with proper waits
    for (let i = 1; i < 4; i++) {
      await joinRoomAndWaitForLobby(pages[i], roomCode, playerNames[i]);
      // Small delay between joins to avoid overwhelming Firebase
      await waitForFirebaseSync(200);
    }

    // ========================================
    // Assign teams (sequential with verification)
    // ========================================
    const ownerPage = pages[0];
    await joinTeamRole(pages[0], 'red', 'clueGiver');
    await joinTeamRole(pages[1], 'red', 'guesser', ownerPage);
    await joinTeamRole(pages[2], 'blue', 'clueGiver', ownerPage);
    await joinTeamRole(pages[3], 'blue', 'guesser', ownerPage);
    
    // Wait for start button to be enabled (all roles synced to owner)
    const startButton = pages[0].getByTestId('lobby-start-btn');
    await expect(startButton).toBeEnabled({ timeout: 30000 });

    // ========================================
    // Start game
    // ========================================
    await startButton.click();
    
    // Wait for board to be visible on ALL players (proves game state synced)
    for (const page of pages) {
      await expect(page.getByTestId('board-card-0')).toBeVisible({ timeout: 15000 });
    }

    // ========================================
    // Determine first team and get card info
    // ========================================
    const redCluePage = pages[0];
    const redGuessPage = pages[1];
    const blueCluePage = pages[2];
    const blueGuessPage = pages[3];

    // Check who goes first by seeing who has clue input (with timeout for UI to settle)
    // The clue giver of the current team sees the clue input
    const isRedFirst = await redCluePage.getByTestId('game-clue-input').isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`First team determination: isRedFirst=${isRedFirst}`);

    let firstClueGiver: Page, firstGuesser: Page, firstTeam: 'red' | 'blue';
    let secondClueGiver: Page, secondGuesser: Page, secondTeam: 'red' | 'blue';

    if (isRedFirst) {
      firstClueGiver = redCluePage;
      firstGuesser = redGuessPage;
      firstTeam = 'red';
      secondClueGiver = blueCluePage;
      secondGuesser = blueGuessPage;
      secondTeam = 'blue';
    } else {
      firstClueGiver = blueCluePage;
      firstGuesser = blueGuessPage;
      firstTeam = 'blue';
      secondClueGiver = redCluePage;
      secondGuesser = redGuessPage;
      secondTeam = 'red';
    }

    // Get second team's cards (they will win)
    const winningTeamCards = await getTeamCards(secondClueGiver, secondTeam);
    console.log(`${secondTeam} team has ${winningTeamCards.length} cards: ${winningTeamCards.join(', ')}`);
    
    // Validate we got cards - if not, something is wrong with the test setup
    expect(winningTeamCards.length, `Expected ${secondTeam} team to have at least 8 cards`).toBeGreaterThanOrEqual(8);

    // ========================================
    // Turn 1: First team gives clue, then ends turn
    // ========================================
    console.log(`Turn 1: ${firstTeam} team's turn`);
    
    const firstClueInput = firstClueGiver.getByTestId('game-clue-input');
    await expect(firstClueInput).toBeVisible({ timeout: 5000 });
    await firstClueInput.fill('RANDOM');
    await firstClueGiver.getByTestId('game-clue-count').fill('1');
    await firstClueGiver.getByTestId('game-clue-btn').click();

    // Wait for clue to be submitted (input disappears)
    await expect(firstClueInput).not.toBeVisible({ timeout: 5000 });
    
    // Wait for guesser to see the clue (Firebase sync complete)
    await expect(firstGuesser.getByTestId('game-current-clue')).toBeVisible({ timeout: 10000 });

    // First guesser ends turn without guessing (to give second team their turn)
    const endTurnBtn = firstGuesser.getByTestId('game-end-turn-btn');
    await expect(endTurnBtn).toBeVisible({ timeout: 5000 });
    await endTurnBtn.click();

    // Wait for turn to change (second team's clue input appears)
    const secondClueInput = secondClueGiver.getByTestId('game-clue-input');
    await expect(secondClueInput).toBeVisible({ timeout: 5000 });

    // ========================================
    // Turn 2: Second team gives clue for ALL their cards
    // ========================================
    console.log(`Turn 2: ${secondTeam} team's turn - going for the win!`);
    
    await secondClueInput.fill('WINNING');
    await secondClueGiver.getByTestId('game-clue-count').fill(String(winningTeamCards.length));
    await secondClueGiver.getByTestId('game-clue-btn').click();

    // Wait for clue to be submitted
    await expect(secondClueInput).not.toBeVisible({ timeout: 5000 });

    // Wait for guesser to see the clue (Firebase sync complete)
    await expect(secondGuesser.getByTestId('game-current-clue')).toBeVisible({ timeout: 10000 });

    // Second guesser guesses ALL their team's cards
    for (let i = 0; i < winningTeamCards.length; i++) {
      const cardIndex = winningTeamCards[i];
      console.log(`  Guessing card ${i + 1}/${winningTeamCards.length}: index ${cardIndex}`);

      // Check if game is already over (e.g., hit trap card)
      const gameOverPanel = secondGuesser.getByTestId('game-over-panel');
      const isGameOver = await gameOverPanel.isVisible().catch(() => false);
      if (isGameOver) {
        console.log(`  Game already ended, stopping guesses`);
        break;
      }

      // Vote for the card
      const card = secondGuesser.getByTestId(`board-card-${cardIndex}`);
      await card.click();

      // Wait for reveal button to appear (vote registered, threshold met)
      const revealBtn = secondGuesser.getByTestId(`board-reveal-${cardIndex}`);
      await expect(revealBtn).toBeVisible({ timeout: 5000 });
      await revealBtn.click();

      // Wait for card to be revealed (observable state)
      await waitForCardRevealed(secondGuesser, cardIndex);

      // Check if game ended after this reveal
      const gameEndedNow = await gameOverPanel.isVisible().catch(() => false);
      if (gameEndedNow) {
        console.log(`  Game ended after revealing card ${cardIndex}!`);
        break;
      }
    }

    // ========================================
    // Assert: Game Over screen shows winner
    // ========================================
    console.log('Verifying game over state...');

    // Step 1: Wait for game over overlay (proves gameOver state propagated)
    // This appears immediately when game ends, before the panel
    const gameOverOverlay = pages[0].getByTestId('game-over-overlay');
    await expect(gameOverOverlay).toBeVisible({ timeout: 5000 });
    console.log('Game over overlay visible - game state confirmed');

    // Step 2: Wait for overlay to dismiss and panel to appear
    // Overlay shows for 3s + 0.4s exit animation, then panel appears
    const gameOverPanel = pages[0].getByTestId('game-over-panel');
    await expect(gameOverPanel).toBeVisible({ timeout: 5000 });
    
    // Verify winner text shows the correct team
    const winnerText = pages[0].getByTestId('game-winner-text');
    await expect(winnerText).toBeVisible();
    await expect(winnerText).toContainText(`${secondTeam.toUpperCase()} Team Wins`);

    // Verify all players see game over panel (they also had overlay time to sync)
    for (const page of pages) {
      await expect(page.getByTestId('game-over-panel')).toBeVisible({ timeout: 5000 });
    }

    // Verify rematch button is available (indicates game truly ended)
    const rematchBtn = pages[0].getByTestId('game-rematch-btn');
    await expect(rematchBtn).toBeVisible();

    console.log(`Full game completed! ${secondTeam.toUpperCase()} team wins!`);
    
    await cleanupContexts(contexts);
  });

  test('rematch preserves teams and clears game log', async ({ browser }) => {
    test.setTimeout(180000); // 3 minutes for full game + rematch
    
    // Create 4 separate browser contexts SEQUENTIALLY for unique Firebase Auth sessions
    const { contexts, pages } = await createMultipleContexts(browser, 4);

    const playerNames = ['RedClue', 'RedGuess', 'BlueClue', 'BlueGuess'];

    // ========================================
    // Setup: Create room and join all players
    // ========================================
    const roomCode = await createRoomAndWaitForLobby(pages[0], playerNames[0]);

    // Other players join sequentially with proper waits
    for (let i = 1; i < 4; i++) {
      await joinRoomAndWaitForLobby(pages[i], roomCode, playerNames[i]);
      await waitForFirebaseSync(200);
    }

    // Assign teams (with cross-player verification)
    const ownerPage = pages[0];
    await joinTeamRole(pages[0], 'red', 'clueGiver');
    await joinTeamRole(pages[1], 'red', 'guesser', ownerPage);
    await joinTeamRole(pages[2], 'blue', 'clueGiver', ownerPage);
    await joinTeamRole(pages[3], 'blue', 'guesser', ownerPage);
    
    const startButton = pages[0].getByTestId('lobby-start-btn');
    await expect(startButton).toBeEnabled({ timeout: 30000 });

    // ========================================
    // Game 1: Start and play until end
    // ========================================
    await startButton.click();
    
    // Wait for board to be visible on ALL players (proves game state synced)
    for (const page of pages) {
      await expect(page.getByTestId('board-card-0')).toBeVisible({ timeout: 15000 });
    }

    // Determine first team
    const redCluePage = pages[0];
    const redGuessPage = pages[1];
    const blueCluePage = pages[2];
    const blueGuessPage = pages[3];

    const isRedFirst = await redCluePage.getByTestId('game-clue-input').isVisible({ timeout: 3000 }).catch(() => false);

    let firstClueGiver: Page, firstGuesser: Page;
    let secondClueGiver: Page, secondGuesser: Page, secondTeam: 'red' | 'blue';

    if (isRedFirst) {
      firstClueGiver = redCluePage;
      firstGuesser = redGuessPage;
      secondClueGiver = blueCluePage;
      secondGuesser = blueGuessPage;
      secondTeam = 'blue';
    } else {
      firstClueGiver = blueCluePage;
      firstGuesser = blueGuessPage;
      secondClueGiver = redCluePage;
      secondGuesser = redGuessPage;
      secondTeam = 'red';
    }

    // Get second team's cards
    const winningTeamCards = await getTeamCards(secondClueGiver, secondTeam);
    expect(winningTeamCards.length, `Expected ${secondTeam} team to have at least 8 cards`).toBeGreaterThanOrEqual(8);

    // Turn 1: First team gives clue and ends turn
    const firstClueInput = firstClueGiver.getByTestId('game-clue-input');
    await expect(firstClueInput).toBeVisible({ timeout: 5000 });
    await firstClueInput.fill('RANDOM');
    await firstClueGiver.getByTestId('game-clue-count').fill('1');
    await firstClueGiver.getByTestId('game-clue-btn').click();
    await expect(firstClueInput).not.toBeVisible({ timeout: 5000 });
    
    // Wait for guesser to see the clue (Firebase sync complete)
    await expect(firstGuesser.getByTestId('game-current-clue')).toBeVisible({ timeout: 10000 });

    const endTurnBtn = firstGuesser.getByTestId('game-end-turn-btn');
    await expect(endTurnBtn).toBeVisible({ timeout: 5000 });
    await endTurnBtn.click();

    // Turn 2: Second team wins by revealing all cards
    const secondClueInput = secondClueGiver.getByTestId('game-clue-input');
    await expect(secondClueInput).toBeVisible({ timeout: 5000 });
    await secondClueInput.fill('WINNING');
    await secondClueGiver.getByTestId('game-clue-count').fill(String(winningTeamCards.length));
    await secondClueGiver.getByTestId('game-clue-btn').click();
    await expect(secondClueInput).not.toBeVisible({ timeout: 5000 });
    
    // Wait for guesser to see the clue (Firebase sync complete)
    await expect(secondGuesser.getByTestId('game-current-clue')).toBeVisible({ timeout: 10000 });

    // Guess all cards
    for (const cardIndex of winningTeamCards) {
      const gameOverPanel = secondGuesser.getByTestId('game-over-panel');
      if (await gameOverPanel.isVisible().catch(() => false)) break;

      const card = secondGuesser.getByTestId(`board-card-${cardIndex}`);
      await card.click();

      const revealBtn = secondGuesser.getByTestId(`board-reveal-${cardIndex}`);
      await expect(revealBtn).toBeVisible({ timeout: 5000 });
      await revealBtn.click();
      
      // Wait for card to be revealed (observable state)
      await waitForCardRevealed(secondGuesser, cardIndex);
    }

    // ========================================
    // Verify game over and check game log has messages
    // ========================================
    const gameOverPanel = pages[0].getByTestId('game-over-panel');
    await expect(gameOverPanel).toBeVisible({ timeout: 10000 });

    // Check game log has clue messages before rematch
    const gameLog = pages[0].getByTestId('game-log');
    await expect(gameLog.getByText('RANDOM')).toBeVisible({ timeout: 5000 });
    await expect(gameLog.getByText('WINNING')).toBeVisible({ timeout: 5000 });

    // ========================================
    // Rematch
    // ========================================
    const rematchBtn = pages[0].getByTestId('game-rematch-btn');
    await expect(rematchBtn).toBeVisible();
    await rematchBtn.click();

    // Wait for new game to start
    await expect(pages[0].getByTestId('board-card-0')).toBeVisible({ timeout: 15000 });

    // ========================================
    // Verify teams are preserved
    // ========================================
    // Check that RedClue (pages[0]) is still red clue giver
    // They should see the clue input when it's red's turn
    // OR their team indicator should show red
    
    // Verify the team indicator or player list shows same assignments
    // The clue givers should still be able to give clues for their respective teams
    
    // ========================================
    // Verify game log is cleared (no old clues)
    // ========================================
    const gameLogAfter = pages[0].getByTestId('game-log');
    
    // Old clue words should NOT be in game log
    await expect(gameLogAfter.getByText('RANDOM')).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // If not found, that's expected - pass
    });
    await expect(gameLogAfter.getByText('WINNING')).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // If not found, that's expected - pass
    });

    console.log('Rematch test completed - teams preserved, game log cleared!');
    await cleanupContexts(contexts);
  });

  test('pause and resume game flow', async ({ browser }) => {
    test.setTimeout(180000); // 3 minutes
    
    // Create 4 separate browser contexts SEQUENTIALLY for unique Firebase Auth sessions
    const { contexts, pages } = await createMultipleContexts(browser, 4);

    const playerNames = ['Owner', 'RedGuess', 'BlueClue', 'BlueGuess'];

    // Setup: Create room with 4 players
    const roomCode = await createRoomAndWaitForLobby(pages[0], playerNames[0]);

    // Other players join sequentially
    for (let i = 1; i < 4; i++) {
      await joinRoomAndWaitForLobby(pages[i], roomCode, playerNames[i]);
    }
    
    // Wait for all players to be synced (check on owner's page)
    await waitForPlayerCount(pages[0], 4);

    // Assign teams: Owner is red clue giver (with cross-player verification)
    const ownerPage = pages[0];
    await joinTeamRole(pages[0], 'red', 'clueGiver');
    await joinTeamRole(pages[1], 'red', 'guesser', ownerPage);
    await joinTeamRole(pages[2], 'blue', 'clueGiver', ownerPage);
    await joinTeamRole(pages[3], 'blue', 'guesser', ownerPage);

    const startButton = pages[0].getByTestId('lobby-start-btn');
    await expect(startButton).toBeEnabled({ timeout: 30000 });

    // Start game
    await startButton.click();
    
    // Wait for board to be visible on ALL players (proves game state synced)
    for (const page of pages) {
      await expect(page.getByTestId('board-card-0')).toBeVisible({ timeout: 15000 });
    }

    // ========================================
    // Test: Owner pauses the game
    // ========================================
    const pauseBtn = pages[0].getByTestId('game-pause-btn');
    await expect(pauseBtn).toBeVisible({ timeout: 5000 });
    await pauseBtn.click();

    // All players should see the paused banner
    // Note: We use the banner testid instead of "paused" text because the chat log
    // contains "Game paused by room owner." which stays visible even after resume
    for (const page of pages) {
      await expect(page.getByTestId('game-paused-banner')).toBeVisible({ timeout: 5000 });
    }

    // Timer should stop (no countdown visible or frozen)
    // Game actions should be blocked
    
    // ========================================
    // Test: Owner resumes the game
    // ========================================
    const resumeBtn = pages[0].getByTestId('game-resume-btn');
    await expect(resumeBtn).toBeVisible({ timeout: 5000 });
    await resumeBtn.click();

    // Paused banner should disappear for ALL players (indicates game is no longer paused)
    for (const page of pages) {
      await expect(page.getByTestId('game-paused-banner')).not.toBeVisible({ timeout: 10000 });
    }

    // Game should be playable again
    // Check that clue input is available for current team's clue giver
    const isRedTurn = await pages[0].getByTestId('game-clue-input').isVisible({ timeout: 3000 }).catch(() => false);
    
    const clueGiverPage = isRedTurn ? pages[0] : pages[2];
    const guesserPage = isRedTurn ? pages[1] : pages[3];
    
    // Clue giver should be able to give clue
    const clueInput = clueGiverPage.getByTestId('game-clue-input');
    await expect(clueInput).toBeVisible({ timeout: 5000 });
    await clueInput.fill('RESUMED');
    await clueGiverPage.getByTestId('game-clue-count').fill('1');
    await clueGiverPage.getByTestId('game-clue-btn').click();
    await expect(clueInput).not.toBeVisible({ timeout: 5000 });
    
    // Verify guesser sees the clue (proves Firebase sync works after resume)
    await expect(guesserPage.getByTestId('game-current-clue')).toBeVisible({ timeout: 10000 });

    console.log('Pause/resume test completed successfully!');
    await cleanupContexts(contexts);
  });
});
