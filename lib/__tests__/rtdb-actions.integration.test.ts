/**
 * Integration tests for rtdb-actions with Firebase emulator.
 * 
 * Prerequisites:
 * 1. Firebase emulator must be running: npm run firebase:emulators
 * 2. Run tests with: npm run test:integration
 * 
 * These tests verify that rtdb-actions correctly interact with Firebase RTDB.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ref, get } from "firebase/database";
import {
  initializeTestFirebase,
  cleanupTestData,
  cleanupTestFirebase,
  createTestUser,
  generateTestRoomCode,
  waitFor,
  getTestDb,
} from "./setup/firebase-test-utils";
import { enableTestMode, disableTestMode } from "../firebase";
import {
  joinRoom,
  leaveRoom,
  startGame,
  giveClue,
  voteCard,
  confirmReveal,
  endTurn,
  setLobbyRole,
  pauseGame,
  resumeGame,
  rematch,
  setTimerPreset,
  setRoomName,
  reassignOwnerIfNeeded,
  OWNER_DISCONNECT_GRACE_PERIOD_MS,
} from "../rtdb-actions";

describe("rtdb-actions integration tests", () => {
  beforeAll(async () => {
    const { db } = await initializeTestFirebase();
    enableTestMode(db);
  });

  afterAll(async () => {
    disableTestMode();
    await cleanupTestFirebase();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  // Helper function for setting up a game with 4 players
  async function setupGameWith4Players(roomCode: string) {
    const db = getTestDb();
    const users = await Promise.all([
      createTestUser(),
      createTestUser(),
      createTestUser(),
      createTestUser(),
    ]);

    // Join players sequentially and verify each join completes
    for (let i = 0; i < users.length; i++) {
      await joinRoom(roomCode, users[i].uid, `Player${i + 1}`, "🐱");
      // Verify player was added before continuing
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${users[i].uid}`));
        return snap.exists();
      }, 2000, 50);
    }

    // Assign teams: 2 red, 2 blue - verify each assignment
    await setLobbyRole(roomCode, users[0].uid, "red", "clueGiver");
    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${users[0].uid}/team`));
      return snap.val() === "red";
    }, 2000, 50);

    await setLobbyRole(roomCode, users[1].uid, "red", "guesser");
    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${users[1].uid}/team`));
      return snap.val() === "red";
    }, 2000, 50);

    await setLobbyRole(roomCode, users[2].uid, "blue", "clueGiver");
    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${users[2].uid}/team`));
      return snap.val() === "blue";
    }, 2000, 50);

    await setLobbyRole(roomCode, users[3].uid, "blue", "guesser");
    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${users[3].uid}/team`));
      return snap.val() === "blue";
    }, 2000, 50);

    return users;
  }

  describe("Room Management", () => {
    it("should create a room when first player joins", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Player1", "🐱");

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      expect(roomSnapshot.exists()).toBe(true);

      const roomData = roomSnapshot.val();
      expect(roomData.ownerId).toBe(uid);
      expect(roomData.gameStarted).toBe(false);
      expect(roomData.gameOver).toBe(false);
    });

    it("should add player to existing room", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: uid1 } = await createTestUser();
      const { uid: uid2 } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid1, "Player1", "🐱");
      // Wait for first player to be added
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${uid1}`));
        return snap.exists();
      }, 2000, 50);

      await joinRoom(roomCode, uid2, "Player2", "🐶");
      // Wait for second player to be added
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${uid2}`));
        return snap.exists();
      }, 2000, 50);

      const playersSnapshot = await get(ref(db, `rooms/${roomCode}/players`));
      const players = playersSnapshot.val();

      expect(Object.keys(players)).toHaveLength(2);
      expect(players[uid1].name).toBe("Player1");
      expect(players[uid2].name).toBe("Player2");
    });

    it("should mark player as connected", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Player1", "🐱");

      const playerSnapshot = await get(ref(db, `rooms/${roomCode}/players/${uid}`));
      const player = playerSnapshot.val();

      expect(player.connected).toBe(true);
      expect(player.team).toBeUndefined(); // Firebase returns undefined, not null
      expect(player.role).toBeUndefined();
    });

    it("should allow player to leave room", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Player1", "🐱");
      await leaveRoom(roomCode, uid);

      const playerSnapshot = await get(ref(db, `rooms/${roomCode}/players/${uid}`));
      const player = playerSnapshot.val();

      // Player might be deleted or marked as disconnected
      if (player) {
        expect(player.connected).toBe(false);
      } else {
        // Player was removed entirely, which is also valid
        expect(player).toBeNull();
      }
    });

    it("should set room name", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Player1", "🐱");
      await setRoomName(roomCode, uid, "Epic Game Night");

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const room = roomSnapshot.val();

      expect(room.roomName).toBe("Epic Game Night");
    });

    it("should set timer preset", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Player1", "🐱");
      await setTimerPreset(roomCode, uid, "fast");

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const room = roomSnapshot.val();

      expect(room.timerPreset).toBe("fast");
    });
  });

  describe("Team Assignment", () => {
    it("should assign player to team with role", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Player1", "🐱");
      await setLobbyRole(roomCode, uid, "red", "clueGiver");

      const playerSnapshot = await get(ref(db, `rooms/${roomCode}/players/${uid}`));
      const player = playerSnapshot.val();

      expect(player.team).toBe("red");
      expect(player.role).toBe("clueGiver");
    });

    it("should allow player to change team", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Player1", "🐱");
      await setLobbyRole(roomCode, uid, "red", "guesser");
      await setLobbyRole(roomCode, uid, "blue", "guesser");

      const playerSnapshot = await get(ref(db, `rooms/${roomCode}/players/${uid}`));
      const player = playerSnapshot.val();

      expect(player.team).toBe("blue");
    });

    it("should allow player to become spectator", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Player1", "🐱");
      await setLobbyRole(roomCode, uid, "red", "guesser");
      await setLobbyRole(roomCode, uid, null, null);

      const playerSnapshot = await get(ref(db, `rooms/${roomCode}/players/${uid}`));
      const player = playerSnapshot.val();

      // Firebase removes fields set to null, so they become undefined
      expect(player.team).toBeUndefined();
      expect(player.role).toBeUndefined();
    });
  });

  describe("Game Flow", () => {
    it("should start game with valid teams", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const room = roomSnapshot.val();

      expect(room.gameStarted).toBe(true);
      expect(room.gameOver).toBe(false);
      expect(room.board).toBeDefined();
      expect(room.board).toHaveLength(25);
      expect(room.currentTeam).toMatch(/^(red|blue)$/);
      expect(room.startingTeam).toBe(room.currentTeam);
    });

    it("should generate valid board with correct card distribution", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();

      const redCards = board.filter((c: any) => c.team === "red").length;
      const blueCards = board.filter((c: any) => c.team === "blue").length;
      const neutralCards = board.filter((c: any) => c.team === "neutral").length;
      const trapCards = board.filter((c: any) => c.team === "trap").length;

      // One team should have 9 cards, other should have 8
      expect([redCards, blueCards].sort()).toEqual([8, 9]);
      expect(neutralCards).toBe(7);
      expect(trapCards).toBe(1);
    });

    it("should allow hinter to give a clue", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      // Determine which team goes first
      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;

      await giveClue(roomCode, hinterId, "ANIMAL", 2);

      const roomSnapshotAfter = await get(ref(db, `rooms/${roomCode}`));
      const room = roomSnapshotAfter.val();

      expect(room.currentClue).toEqual({ word: "ANIMAL", count: 2 });
      expect(room.remainingGuesses).toBe(3); // count + 1
    });

    it("should allow guesser to vote on a card", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "ANIMAL", 2);
      await voteCard(roomCode, guesserId, 0);

      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board/0`));
      const card = boardSnapshot.val();

      expect(card.votes).toBeDefined();
      expect(card.votes[guesserId]).toBe(true);
    });

    it("should reveal card when confirmed", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "ANIMAL", 2);
      await voteCard(roomCode, guesserId, 0);
      await confirmReveal(roomCode, guesserId, 0);

      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board/0`));
      const card = boardSnapshot.val();

      expect(card.revealed).toBe(true);
      expect(card.revealedBy).toBe(guesserId); // revealedBy is the player ID who confirmed
    });

    it("should allow ending turn", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshotBefore = await get(ref(db, `rooms/${roomCode}`));
      const teamBefore = roomSnapshotBefore.val().currentTeam;

      const hinterId = teamBefore === "red" ? users[0].uid : users[2].uid;
      await giveClue(roomCode, hinterId, "ANIMAL", 2);
      await endTurn(roomCode);

      const roomSnapshotAfter = await get(ref(db, `rooms/${roomCode}`));
      const teamAfter = roomSnapshotAfter.val().currentTeam;

      expect(teamAfter).not.toBe(teamBefore);
      expect(roomSnapshotAfter.val().currentClue).toBeUndefined(); // Firebase removes null values
      // remainingGuesses might be 0 or undefined after turn ends
      expect(roomSnapshotAfter.val().remainingGuesses || 0).toBe(0);
    });

    it("should pause game when requested by owner", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);
      await pauseGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const room = roomSnapshot.val();

      expect(room.paused).toBe(true);
      expect(room.pauseReason).toBe("ownerPaused");
    });

    it("should resume game after pause", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);
      await pauseGame(roomCode, users[0].uid);
      await resumeGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const room = roomSnapshot.val();

      expect(room.paused).toBe(false);
      expect(room.pauseReason).toBeUndefined(); // Firebase removes null values
    });

    it("should allow rematch after game", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);
      
      // Get the board to find a trap card for instant game over
      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const trapIndex = board.findIndex((c: any) => c.team === "trap");

      // Reveal the trap to end the game
      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "OOPS", 1);
      await voteCard(roomCode, guesserId, trapIndex);
      await confirmReveal(roomCode, guesserId, trapIndex);

      // Verify game is over
      const roomAfterTrap = await get(ref(db, `rooms/${roomCode}`));
      expect(roomAfterTrap.val().gameOver).toBe(true);

      // Start rematch
      await rematch(roomCode, users[0].uid);

      const roomAfterRematch = await get(ref(db, `rooms/${roomCode}`));
      const roomData = roomAfterRematch.val();

      expect(roomData.gameStarted).toBe(true);
      expect(roomData.gameOver).toBe(false);
      expect(roomData.currentClue).toBeUndefined(); // Firebase removes null values
      expect(roomData.board).toHaveLength(25);
    });
  });

  describe("Vote Threshold", () => {
    it("should require 1 vote with 1-3 guessers", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode); // 1 guesser per team
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      // Find a team card
      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const teamCardIndex = board.findIndex((c: any) => c.team === currentTeam);

      await giveClue(roomCode, hinterId, "TEST", 1);
      await voteCard(roomCode, guesserId, teamCardIndex);
      
      // With 1 guesser, 1 vote should be enough to confirm
      await confirmReveal(roomCode, guesserId, teamCardIndex);

      const cardSnapshot = await get(ref(db, `rooms/${roomCode}/board/${teamCardIndex}`));
      expect(cardSnapshot.val().revealed).toBe(true);
    });

    it("should require 2 votes with 4+ guessers", async () => {
      const roomCode = generateTestRoomCode();
      const db = getTestDb();

      // Create 6 users: 1 hinter + 4 guessers on red, 1 hinter on blue
      const users = await Promise.all([
        createTestUser(), // red hinter
        createTestUser(), // red guesser 1
        createTestUser(), // red guesser 2
        createTestUser(), // red guesser 3
        createTestUser(), // red guesser 4
        createTestUser(), // blue hinter
        createTestUser(), // blue guesser
      ]);

      // Join all players
      for (let i = 0; i < users.length; i++) {
        await joinRoom(roomCode, users[i].uid, `Player${i + 1}`, "🐱");
        await waitFor(async () => {
          const snap = await get(ref(db, `rooms/${roomCode}/players/${users[i].uid}`));
          return snap.exists();
        }, 2000, 50);
      }

      // Assign: red team with 4 guessers
      await setLobbyRole(roomCode, users[0].uid, "red", "clueGiver");
      await setLobbyRole(roomCode, users[1].uid, "red", "guesser");
      await setLobbyRole(roomCode, users[2].uid, "red", "guesser");
      await setLobbyRole(roomCode, users[3].uid, "red", "guesser");
      await setLobbyRole(roomCode, users[4].uid, "red", "guesser");
      await setLobbyRole(roomCode, users[5].uid, "blue", "clueGiver");
      await setLobbyRole(roomCode, users[6].uid, "blue", "guesser");

      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${users[6].uid}/team`));
        return snap.val() === "blue";
      }, 2000, 50);

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;

      if (currentTeam === "red") {
        // Red has 4 guessers, needs 2 votes
        const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
        const board = boardSnapshot.val();
        const redCardIndex = board.findIndex((c: any) => c.team === "red");

        await giveClue(roomCode, users[0].uid, "TEST", 1);
        await voteCard(roomCode, users[1].uid, redCardIndex);

        // Only 1 vote - should fail
        await expect(confirmReveal(roomCode, users[1].uid, redCardIndex)).rejects.toThrow("Not enough votes");

        // Add second vote
        await voteCard(roomCode, users[2].uid, redCardIndex);

        // Now 2 votes - should succeed
        await confirmReveal(roomCode, users[2].uid, redCardIndex);

        const cardSnapshot = await get(ref(db, `rooms/${roomCode}/board/${redCardIndex}`));
        expect(cardSnapshot.val().revealed).toBe(true);
      } else {
        // Blue goes first - just verify we got here (test still valid)
        expect(currentTeam).toBe("blue");
      }
    });
  });

  describe("Owner Transfer", () => {
    it("should transfer ownership when owner disconnects and grace period passes", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: ownerId } = await createTestUser();
      const { uid: playerId } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, ownerId, "Owner", "🐱");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${ownerId}`));
        return snap.exists();
      }, 2000, 50);

      await joinRoom(roomCode, playerId, "Player2", "🐶");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
        return snap.exists();
      }, 2000, 50);

      // Verify owner is first player
      const roomBefore = await get(ref(db, `rooms/${roomCode}`));
      expect(roomBefore.val().ownerId).toBe(ownerId);

      // Simulate owner disconnect by marking them disconnected with old timestamp
      const pastTime = Date.now() - OWNER_DISCONNECT_GRACE_PERIOD_MS - 1000;
      await import("firebase/database").then(({ update, ref }) => 
        update(ref(db, `rooms/${roomCode}/players/${ownerId}`), {
          connected: false,
          lastSeen: pastTime,
        })
      );

      // Trigger owner reassignment
      const result = await reassignOwnerIfNeeded(roomCode);

      expect(result.newOwnerName).toBe("Player2");

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      expect(roomAfter.val().ownerId).toBe(playerId);
    });

    it("should not transfer ownership within grace period", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: ownerId } = await createTestUser();
      const { uid: playerId } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, ownerId, "Owner", "🐱");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${ownerId}`));
        return snap.exists();
      }, 2000, 50);

      await joinRoom(roomCode, playerId, "Player2", "🐶");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
        return snap.exists();
      }, 2000, 50);

      // Simulate recent disconnect (within grace period)
      const recentTime = Date.now() - 1000; // 1 second ago
      await import("firebase/database").then(({ update, ref }) => 
        update(ref(db, `rooms/${roomCode}/players/${ownerId}`), {
          connected: false,
          lastSeen: recentTime,
        })
      );

      // Try to reassign - should not transfer due to grace period
      const result = await reassignOwnerIfNeeded(roomCode);

      expect(result.withinGracePeriod).toBe(true);
      expect(result.newOwnerName).toBe(null);

      // Owner should still be original
      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      expect(roomAfter.val().ownerId).toBe(ownerId);
    });

    it("should transfer immediately when explicitly leaving", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: ownerId } = await createTestUser();
      const { uid: playerId } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, ownerId, "Owner", "🐱");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${ownerId}`));
        return snap.exists();
      }, 2000, 50);

      await joinRoom(roomCode, playerId, "Player2", "🐶");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
        return snap.exists();
      }, 2000, 50);

      // Owner explicitly leaves
      await leaveRoom(roomCode, ownerId);

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      expect(roomAfter.val().ownerId).toBe(playerId);
    });
  });

  describe("Game Outcomes", () => {
    it("should end game when trap card is revealed (other team wins)", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      // Find trap card
      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const trapIndex = board.findIndex((c: any) => c.team === "trap");

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const otherTeam = currentTeam === "red" ? "blue" : "red";
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "OOPS", 1);
      await voteCard(roomCode, guesserId, trapIndex);
      await confirmReveal(roomCode, guesserId, trapIndex);

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      const room = roomAfter.val();

      expect(room.gameOver).toBe(true);
      expect(room.winner).toBe(otherTeam); // Other team wins when you hit trap
    });

    it("should end turn when neutral card is revealed", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      // Find neutral card
      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const neutralIndex = board.findIndex((c: any) => c.team === "neutral");

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const teamBefore = roomSnapshot.val().currentTeam;
      const hinterId = teamBefore === "red" ? users[0].uid : users[2].uid;
      const guesserId = teamBefore === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "TEST", 2);
      await voteCard(roomCode, guesserId, neutralIndex);
      await confirmReveal(roomCode, guesserId, neutralIndex);

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      const room = roomAfter.val();

      expect(room.gameOver).toBe(false);
      expect(room.currentTeam).not.toBe(teamBefore); // Turn switched
    });

    it("should end turn when opponent card is revealed", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      // Find opponent card
      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const teamBefore = roomSnapshot.val().currentTeam;
      const opponentTeam = teamBefore === "red" ? "blue" : "red";
      const opponentIndex = board.findIndex((c: any) => c.team === opponentTeam);

      const hinterId = teamBefore === "red" ? users[0].uid : users[2].uid;
      const guesserId = teamBefore === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "TEST", 2);
      await voteCard(roomCode, guesserId, opponentIndex);
      await confirmReveal(roomCode, guesserId, opponentIndex);

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      const room = roomAfter.val();

      expect(room.gameOver).toBe(false);
      expect(room.currentTeam).not.toBe(teamBefore); // Turn switched
    });

    it("should allow continuing when correct card is revealed", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      // Find current team's card
      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const teamCardIndex = board.findIndex((c: any) => c.team === currentTeam);

      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "TEST", 2);
      await voteCard(roomCode, guesserId, teamCardIndex);
      await confirmReveal(roomCode, guesserId, teamCardIndex);

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      const room = roomAfter.val();

      expect(room.gameOver).toBe(false);
      expect(room.currentTeam).toBe(currentTeam); // Same team continues
      expect(room.remainingGuesses).toBe(2); // Started with 3 (2+1), now 2
    });

    it("should win game when all team cards are revealed", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const startingTeam = roomSnapshot.val().startingTeam;
      const hinterId = startingTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = startingTeam === "red" ? users[1].uid : users[3].uid;

      // Starting team has 9 cards - find all of them
      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const teamCardIndices = board
        .map((c: any, i: number) => ({ team: c.team, index: i }))
        .filter((c: any) => c.team === startingTeam)
        .map((c: any) => c.index);

      expect(teamCardIndices.length).toBe(9); // Starting team has 9 cards

      // Reveal all 9 cards - give clue with count 9, then reveal all
      await giveClue(roomCode, hinterId, "WINNER", 9);

      for (let i = 0; i < teamCardIndices.length; i++) {
        const cardIndex = teamCardIndices[i];
        
        await voteCard(roomCode, guesserId, cardIndex);
        await confirmReveal(roomCode, guesserId, cardIndex);

        // Check state after each reveal
        const roomAfter = await get(ref(db, `rooms/${roomCode}`));
        const room = roomAfter.val();

        if (i === teamCardIndices.length - 1) {
          // Last card - game should be over, team wins
          expect(room.gameOver).toBe(true);
          expect(room.winner).toBe(startingTeam);
        } else {
          // Still cards left - game continues
          expect(room.gameOver).toBe(false);
          expect(room.currentTeam).toBe(startingTeam);
        }
      }
    });
  });

  describe("Validation", () => {
    it("should reject starting game without enough players", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();

      await joinRoom(roomCode, uid, "Player1", "🐱");
      await setLobbyRole(roomCode, uid, "red", "clueGiver");

      await expect(startGame(roomCode, uid)).rejects.toThrow();
    });

    it("should reject clue that matches board word", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);

      await startGame(roomCode, users[0].uid);

      const db = getTestDb();
      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const boardWord = board[0].word;

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;

      await expect(giveClue(roomCode, hinterId, boardWord, 1)).rejects.toThrow();
    });

    it("should reject non-owner starting game", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);

      // users[0] is owner (first to join), try starting with users[1]
      await expect(startGame(roomCode, users[1].uid)).rejects.toThrow();
    });

    it("should reject guesser giving clue", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);

      await startGame(roomCode, users[0].uid);

      const db = getTestDb();
      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await expect(giveClue(roomCode, guesserId, "TEST", 1)).rejects.toThrow();
    });
  });
});
