/**
 * Integration tests for lib/rtdb/game-lifecycle.ts
 * Tests: startGame, endGame, pauseGame, resumeGame, rematch, auto-pause.
 */

import { describe, it, expect } from "vitest";
import { ref, get, update } from "firebase/database";
import {
  createTestUser,
  generateTestRoomCode,
  waitFor,
  getTestDb,
} from "../setup/firebase-test-utils";
import { setupIntegrationSuite, setupGameWith4Players } from "../setup/integration-helpers";
import {
  joinRoom,
  setLobbyRole,
  startGame,
  endGame,
  pauseGame,
  resumeGame,
  rematch,
  giveClue,
  voteCard,
  confirmReveal,
  endTurn,
  sendMessage,
} from "../../rtdb";

describe("rtdb – game-lifecycle", () => {
  setupIntegrationSuite();

  describe("Start Game", () => {
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

      expect([redCards, blueCards].sort()).toEqual([8, 9]);
      expect(neutralCards).toBe(7);
      expect(trapCards).toBe(1);
    });

    it("should reject starting game without enough players", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();

      await joinRoom(roomCode, uid, "Player1", "🐱");
      await setLobbyRole(roomCode, uid, "red", "clueGiver");

      await expect(startGame(roomCode, uid)).rejects.toThrow();
    });

    it("should reject non-owner starting game", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);

      await expect(startGame(roomCode, users[1].uid)).rejects.toThrow();
    });
  });

  describe("Pause / Resume", () => {
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
      expect(room.pauseReason).toBeUndefined();
    });
  });

  describe("End Game", () => {
    it("should reset game state and clear player teams", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomBefore = await get(ref(db, `rooms/${roomCode}`));
      expect(roomBefore.val().gameStarted).toBe(true);
      expect(roomBefore.val().board.length).toBe(25);

      await endGame(roomCode, users[0].uid);

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      const room = roomAfter.val();

      expect(room.gameStarted).toBe(false);
      expect(room.gameOver).toBe(false);
      expect(room.winner).toBeUndefined();
      expect(room.currentClue).toBeUndefined();
      expect(room.remainingGuesses).toBeUndefined();
      expect(room.turnStartTime).toBeUndefined();
      expect(room.paused).toBe(false);
      expect(room.board).toBeUndefined();

      Object.values(room.players).forEach((p: any) => {
        expect(p.team).toBeUndefined();
        expect(p.role).toBeUndefined();
      });
    });

    it("should reject non-owner ending game", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);

      await startGame(roomCode, users[0].uid);

      await expect(endGame(roomCode, users[1].uid)).rejects.toThrow(/not room owner/i);
    });

    it("should reject ending game that has not started", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Owner", "🐱");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${uid}`));
        return snap.exists();
      }, 2000, 50);

      await expect(endGame(roomCode, uid)).rejects.toThrow(/game not started/i);
    });

    it("should add system message when game ends", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);
      await endGame(roomCode, users[0].uid);

      const messagesSnap = await get(ref(db, `rooms/${roomCode}/messages`));
      const messages = messagesSnap.val();
      const messageValues = Object.values(messages) as any[];

      const endGameMessage = messageValues.find(
        (m) => m.type === "game-system" && m.message.includes("ended by room owner")
      );
      expect(endGameMessage).toBeDefined();
    });
  });

  describe("Rematch", () => {
    it("should allow rematch after game", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const trapIndex = board.findIndex((c: any) => c.team === "trap");

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "OOPS", 1);
      await voteCard(roomCode, guesserId, trapIndex);
      await confirmReveal(roomCode, guesserId, trapIndex);

      const roomAfterTrap = await get(ref(db, `rooms/${roomCode}`));
      expect(roomAfterTrap.val().gameOver).toBe(true);

      await rematch(roomCode, users[0].uid);

      const roomAfterRematch = await get(ref(db, `rooms/${roomCode}`));
      const roomData = roomAfterRematch.val();

      expect(roomData.gameStarted).toBe(true);
      expect(roomData.gameOver).toBe(false);
      expect(roomData.currentClue).toBeUndefined();
      expect(roomData.board).toHaveLength(25);
    });

    it("should preserve team assignments on rematch", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      const playersBeforeSnap = await get(ref(db, `rooms/${roomCode}/players`));
      const playersBefore = playersBeforeSnap.val();
      const originalTeams: Record<string, { team: string; role: string }> = {};
      Object.entries(playersBefore).forEach(([uid, data]: [string, any]) => {
        originalTeams[uid] = { team: data.team, role: data.role };
      });

      await startGame(roomCode, users[0].uid);

      const boardSnap = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnap.val();
      const trapIndex = board.findIndex((c: any) => c.team === "trap");

      const roomSnap = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnap.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "OOPS", 1);
      await voteCard(roomCode, guesserId, trapIndex);
      await confirmReveal(roomCode, guesserId, trapIndex);

      const roomAfterTrap = await get(ref(db, `rooms/${roomCode}`));
      expect(roomAfterTrap.val().gameOver).toBe(true);

      await rematch(roomCode, users[0].uid);

      const playersAfterSnap = await get(ref(db, `rooms/${roomCode}/players`));
      const playersAfter = playersAfterSnap.val();

      Object.entries(playersAfter).forEach(([uid, data]: [string, any]) => {
        expect(data.team).toBe(originalTeams[uid].team);
        expect(data.role).toBe(originalTeams[uid].role);
      });
    });

    it("should clear game log messages on rematch but keep chat", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      await sendMessage(roomCode, users[1].uid, "Good luck team!", "chat");

      const roomSnap = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnap.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "ANIMAL", 1);

      const boardSnap = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnap.val();
      const teamCardIndex = board.findIndex((c: any) => c.team === currentTeam);
      await voteCard(roomCode, guesserId, teamCardIndex);
      await confirmReveal(roomCode, guesserId, teamCardIndex);

      const trapIndex = board.findIndex((c: any) => c.team === "trap");
      await voteCard(roomCode, guesserId, trapIndex);
      await confirmReveal(roomCode, guesserId, trapIndex);

      let messagesSnap = await get(ref(db, `rooms/${roomCode}/messages`));
      let messages = Object.values(messagesSnap.val()) as any[];

      expect(messages.filter((m) => m.type === "clue").length).toBeGreaterThan(0);
      expect(messages.filter((m) => m.type === "reveal").length).toBeGreaterThan(0);
      expect(messages.filter((m) => m.type === "chat").length).toBe(1);

      await rematch(roomCode, users[0].uid);

      messagesSnap = await get(ref(db, `rooms/${roomCode}/messages`));
      messages = Object.values(messagesSnap.val()) as any[];

      expect(messages.filter((m) => m.type === "clue").length).toBe(0);
      expect(messages.filter((m) => m.type === "reveal").length).toBe(0);

      const chatAfter = messages.filter((m) => m.type === "chat");
      expect(chatAfter.length).toBe(1);
      expect(chatAfter[0].message).toBe("Good luck team!");
    });

    it("should generate fresh board on rematch", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const boardSnap1 = await get(ref(db, `rooms/${roomCode}/board`));
      const board1 = boardSnap1.val().map((c: any) => c.word);

      const trapIndex = boardSnap1.val().findIndex((c: any) => c.team === "trap");
      const roomSnap = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnap.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "OOPS", 1);
      await voteCard(roomCode, guesserId, trapIndex);
      await confirmReveal(roomCode, guesserId, trapIndex);

      await rematch(roomCode, users[0].uid);

      const boardSnap2 = await get(ref(db, `rooms/${roomCode}/board`));
      const board2 = boardSnap2.val().map((c: any) => c.word);

      expect(board1.join(",")).not.toBe(board2.join(","));
    });
  });

  describe("Auto-pause on Disconnection", () => {
    it("should pause when clue giver disconnects before giving clue", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;

      // Reconnect hinter temporarily to give a clue
      await update(ref(db, `rooms/${roomCode}/players/${hinterId}`), {
        connected: true,
      });

      await giveClue(roomCode, hinterId, "TEST", 1);

      // Now disconnect the OTHER team's hinter
      const incomingHinter = currentTeam === "red" ? users[2].uid : users[0].uid;
      await update(ref(db, `rooms/${roomCode}/players/${incomingHinter}`), {
        connected: false,
        lastSeen: Date.now(),
      });

      await endTurn(roomCode);

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      const room = roomAfter.val();
      expect(room.paused).toBe(true);
      expect(room.pauseReason).toBe("clueGiverDisconnected");
    });

    it("should pause when all guessers disconnect after clue given", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;

      await giveClue(roomCode, hinterId, "TEST", 1);

      const incomingTeam = currentTeam === "red" ? "blue" : "red";
      const incomingHinter = incomingTeam === "red" ? users[0].uid : users[2].uid;
      const incomingGuesser = incomingTeam === "red" ? users[1].uid : users[3].uid;

      await update(ref(db, `rooms/${roomCode}/players/${incomingGuesser}`), {
        connected: false,
        lastSeen: Date.now(),
      });

      await update(ref(db, `rooms/${roomCode}/players/${incomingHinter}`), {
        connected: true,
      });

      await endTurn(roomCode);

      // New team gives clue, then we verify no pause (hinter connected, guesser check happens after clue)
      const roomCheck = await get(ref(db, `rooms/${roomCode}`));
      expect(roomCheck.val().paused).toBe(false);
    });

    it("should pause when entire team is disconnected", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;

      await giveClue(roomCode, hinterId, "TEST", 1);

      const incomingHinter = currentTeam === "red" ? users[2].uid : users[0].uid;
      const incomingGuesser = currentTeam === "red" ? users[3].uid : users[1].uid;

      await update(ref(db, `rooms/${roomCode}/players/${incomingHinter}`), {
        connected: false,
        lastSeen: Date.now(),
      });
      await update(ref(db, `rooms/${roomCode}/players/${incomingGuesser}`), {
        connected: false,
        lastSeen: Date.now(),
      });

      await endTurn(roomCode);

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      const room = roomAfter.val();
      expect(room.paused).toBe(true);
      expect(room.pauseReason).toBe("teamDisconnected");
    });

    it("should not pause when team has required players connected", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;

      await giveClue(roomCode, hinterId, "TEST", 1);
      await endTurn(roomCode);

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      const room = roomAfter.val();
      expect(room.paused).toBe(false);
      expect(room.pauseReason).toBeUndefined();
    });
  });
});
