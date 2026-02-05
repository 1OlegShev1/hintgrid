/**
 * Integration tests for lib/rtdb/gameplay.ts
 * Tests: giveClue, voteCard, confirmReveal, endTurn, vote threshold, game outcomes.
 */

import { describe, it, expect } from "vitest";
import { ref, get } from "firebase/database";
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
  giveClue,
  voteCard,
  confirmReveal,
  endTurn,
} from "../../rtdb";

describe("rtdb – gameplay", () => {
  setupIntegrationSuite();

  describe("Clue, Vote, Confirm, End Turn", () => {
    it("should allow hinter to give a clue", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;

      await giveClue(roomCode, hinterId, "ANIMAL", 2);

      const roomSnapshotAfter = await get(ref(db, `rooms/${roomCode}`));
      const room = roomSnapshotAfter.val();

      expect(room.currentClue).toEqual({ word: "ANIMAL", count: 2 });
      expect(room.remainingGuesses).toBe(3);
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
      expect(card.revealedBy).toBe(guesserId);
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
      expect(roomSnapshotAfter.val().currentClue).toBeUndefined();
      expect(roomSnapshotAfter.val().remainingGuesses || 0).toBe(0);
    });
  });

  describe("Validation", () => {
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

  describe("Vote Threshold", () => {
    it("should require 1 vote with 1-3 guessers", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const teamCardIndex = board.findIndex((c: any) => c.team === currentTeam);

      await giveClue(roomCode, hinterId, "TEST", 1);
      await voteCard(roomCode, guesserId, teamCardIndex);

      await confirmReveal(roomCode, guesserId, teamCardIndex);

      const cardSnapshot = await get(ref(db, `rooms/${roomCode}/board/${teamCardIndex}`));
      expect(cardSnapshot.val().revealed).toBe(true);
    });

    it("should require 2 votes with 4+ guessers", async () => {
      const roomCode = generateTestRoomCode();
      const db = getTestDb();

      const users = await Promise.all([
        createTestUser(), createTestUser(), createTestUser(),
        createTestUser(), createTestUser(), createTestUser(),
        createTestUser(),
      ]);

      for (let i = 0; i < users.length; i++) {
        await joinRoom(roomCode, users[i].uid, `Player${i + 1}`, "🐱");
        await waitFor(async () => {
          const snap = await get(ref(db, `rooms/${roomCode}/players/${users[i].uid}`));
          return snap.exists();
        }, 2000, 50);
      }

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
        const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
        const board = boardSnapshot.val();
        const redCardIndex = board.findIndex((c: any) => c.team === "red");

        await giveClue(roomCode, users[0].uid, "TEST", 1);
        await voteCard(roomCode, users[1].uid, redCardIndex);

        await expect(confirmReveal(roomCode, users[1].uid, redCardIndex)).rejects.toThrow("Not enough votes");

        await voteCard(roomCode, users[2].uid, redCardIndex);

        await confirmReveal(roomCode, users[2].uid, redCardIndex);

        const cardSnapshot = await get(ref(db, `rooms/${roomCode}/board/${redCardIndex}`));
        expect(cardSnapshot.val().revealed).toBe(true);
      } else {
        expect(currentTeam).toBe("blue");
      }
    });
  });

  describe("Game Outcomes", () => {
    it("should end game when trap card is revealed (other team wins)", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

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
      expect(room.winner).toBe(otherTeam);
    });

    it("should end turn when neutral card is revealed", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

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
      expect(room.currentTeam).not.toBe(teamBefore);
    });

    it("should end turn when opponent card is revealed", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

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
      expect(room.currentTeam).not.toBe(teamBefore);
    });

    it("should allow continuing when correct card is revealed", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

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
      expect(room.currentTeam).toBe(currentTeam);
      expect(room.remainingGuesses).toBe(2);
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

      const boardSnapshot = await get(ref(db, `rooms/${roomCode}/board`));
      const board = boardSnapshot.val();
      const teamCardIndices = board
        .map((c: any, i: number) => ({ team: c.team, index: i }))
        .filter((c: any) => c.team === startingTeam)
        .map((c: any) => c.index);

      expect(teamCardIndices.length).toBe(9);

      await giveClue(roomCode, hinterId, "WINNER", 9);

      for (let i = 0; i < teamCardIndices.length; i++) {
        const cardIndex = teamCardIndices[i];

        await voteCard(roomCode, guesserId, cardIndex);
        await confirmReveal(roomCode, guesserId, cardIndex);

        const roomAfter = await get(ref(db, `rooms/${roomCode}`));
        const room = roomAfter.val();

        if (i === teamCardIndices.length - 1) {
          expect(room.gameOver).toBe(true);
          expect(room.winner).toBe(startingTeam);
        } else {
          expect(room.gameOver).toBe(false);
          expect(room.currentTeam).toBe(startingTeam);
        }
      }
    });
  });
});
