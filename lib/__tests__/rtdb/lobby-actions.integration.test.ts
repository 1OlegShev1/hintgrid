/**
 * Integration tests for lib/rtdb/lobby-actions.ts
 * Tests: team assignment, room name/timer, kick/ban, randomize, room locking.
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
  leaveRoom,
  setLobbyRole,
  setRoomName,
  setTimerPreset,
  kickPlayer,
  randomizeTeams,
  setRoomLocked,
  startGame,
  giveClue,
  voteCard,
} from "../../rtdb";

describe("rtdb – lobby-actions", () => {
  setupIntegrationSuite();

  describe("Room Settings", () => {
    it("should set room name", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Player1", "🐱");
      await setRoomName(roomCode, uid, "Epic Game Night");

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      expect(roomSnapshot.val().roomName).toBe("Epic Game Night");
    });

    it("should set timer preset", async () => {
      const roomCode = generateTestRoomCode();
      const { uid } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, uid, "Player1", "🐱");
      await setTimerPreset(roomCode, uid, "fast");

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      expect(roomSnapshot.val().timerPreset).toBe("fast");
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
      expect(playerSnapshot.val().team).toBe("blue");
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

      expect(player.team).toBeUndefined();
      expect(player.role).toBeUndefined();
    });
  });

  describe("Kick and Ban", () => {
    it("should remove kicked player and add temporary ban", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: ownerId } = await createTestUser();
      const { uid: targetId } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, ownerId, "Owner", "🐱");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${ownerId}`));
        return snap.exists();
      }, 2000, 50);

      await joinRoom(roomCode, targetId, "Target", "🐶");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${targetId}`));
        return snap.exists();
      }, 2000, 50);

      await kickPlayer(roomCode, ownerId, targetId);

      const playerSnap = await get(ref(db, `rooms/${roomCode}/players/${targetId}`));
      expect(playerSnap.exists()).toBe(false);

      const roomSnap = await get(ref(db, `rooms/${roomCode}`));
      const room = roomSnap.val();
      expect(room.bannedPlayers?.[targetId]).toBeDefined();
      expect(room.bannedPlayers[targetId]).toBeGreaterThan(Date.now());
    });

    it("should prevent banned player from rejoining", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: ownerId } = await createTestUser();
      const { uid: targetId } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, ownerId, "Owner", "🐱");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${ownerId}`));
        return snap.exists();
      }, 2000, 50);

      await joinRoom(roomCode, targetId, "Target", "🐶");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${targetId}`));
        return snap.exists();
      }, 2000, 50);

      await kickPlayer(roomCode, ownerId, targetId);

      await expect(joinRoom(roomCode, targetId, "Target", "🐶")).rejects.toThrow(/banned/i);
    });

    it("should clear kicked player votes from board", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);
      const db = getTestDb();

      await startGame(roomCode, users[0].uid);

      const roomSnapshot = await get(ref(db, `rooms/${roomCode}`));
      const currentTeam = roomSnapshot.val().currentTeam;
      const hinterId = currentTeam === "red" ? users[0].uid : users[2].uid;
      const guesserId = currentTeam === "red" ? users[1].uid : users[3].uid;

      await giveClue(roomCode, hinterId, "TEST", 2);
      await voteCard(roomCode, guesserId, 5);

      const votesBefore = await get(ref(db, `rooms/${roomCode}/board/5/votes`));
      expect(votesBefore.val()?.[guesserId]).toBe(true);

      await kickPlayer(roomCode, users[0].uid, guesserId);

      const votesAfter = await get(ref(db, `rooms/${roomCode}/board/5/votes`));
      expect(votesAfter.val()?.[guesserId]).toBeUndefined();
    });

    it("should reject non-owner trying to kick", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: ownerId } = await createTestUser();
      const { uid: player2Id } = await createTestUser();
      const { uid: player3Id } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, ownerId, "Owner", "🐱");
      await joinRoom(roomCode, player2Id, "Player2", "🐶");
      await joinRoom(roomCode, player3Id, "Player3", "🦊");

      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${player3Id}`));
        return snap.exists();
      }, 2000, 50);

      await expect(kickPlayer(roomCode, player2Id, player3Id)).rejects.toThrow(/not room owner/i);
    });

    it("should reject owner trying to kick themselves", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: ownerId } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, ownerId, "Owner", "🐱");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${ownerId}`));
        return snap.exists();
      }, 2000, 50);

      await expect(kickPlayer(roomCode, ownerId, ownerId)).rejects.toThrow(/cannot kick yourself/i);
    });
  });

  describe("Randomize Teams", () => {
    it("should assign all players to teams with correct roles", async () => {
      const roomCode = generateTestRoomCode();
      const db = getTestDb();

      const users = await Promise.all([
        createTestUser(), createTestUser(), createTestUser(),
        createTestUser(), createTestUser(), createTestUser(),
      ]);

      for (let i = 0; i < users.length; i++) {
        await joinRoom(roomCode, users[i].uid, `Player${i + 1}`, "🐱");
        await waitFor(async () => {
          const snap = await get(ref(db, `rooms/${roomCode}/players/${users[i].uid}`));
          return snap.exists();
        }, 2000, 50);
      }

      await randomizeTeams(roomCode, users[0].uid);

      const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
      const players = playersSnap.val();

      const redPlayers = Object.values(players).filter((p: any) => p.team === "red");
      const bluePlayers = Object.values(players).filter((p: any) => p.team === "blue");

      expect(redPlayers.length).toBe(3);
      expect(bluePlayers.length).toBe(3);

      expect(redPlayers.filter((p: any) => p.role === "clueGiver").length).toBe(1);
      expect(bluePlayers.filter((p: any) => p.role === "clueGiver").length).toBe(1);
      expect(redPlayers.filter((p: any) => p.role === "guesser").length).toBe(2);
      expect(bluePlayers.filter((p: any) => p.role === "guesser").length).toBe(2);
    });

    it("should reject non-owner randomizing teams", async () => {
      const roomCode = generateTestRoomCode();
      const db = getTestDb();

      const users = await Promise.all([
        createTestUser(), createTestUser(),
        createTestUser(), createTestUser(),
      ]);

      for (let i = 0; i < users.length; i++) {
        await joinRoom(roomCode, users[i].uid, `Player${i + 1}`, "🐱");
        await waitFor(async () => {
          const snap = await get(ref(db, `rooms/${roomCode}/players/${users[i].uid}`));
          return snap.exists();
        }, 2000, 50);
      }

      await expect(randomizeTeams(roomCode, users[1].uid)).rejects.toThrow(/not room owner/i);
    });

    it("should reject randomize with fewer than 4 players", async () => {
      const roomCode = generateTestRoomCode();
      const db = getTestDb();

      const users = await Promise.all([
        createTestUser(), createTestUser(), createTestUser(),
      ]);

      for (let i = 0; i < users.length; i++) {
        await joinRoom(roomCode, users[i].uid, `Player${i + 1}`, "🐱");
        await waitFor(async () => {
          const snap = await get(ref(db, `rooms/${roomCode}/players/${users[i].uid}`));
          return snap.exists();
        }, 2000, 50);
      }

      await expect(randomizeTeams(roomCode, users[0].uid)).rejects.toThrow(/at least 4 players/i);
    });

    it("should reject randomize during active game", async () => {
      const roomCode = generateTestRoomCode();
      const users = await setupGameWith4Players(roomCode);

      await startGame(roomCode, users[0].uid);

      await expect(randomizeTeams(roomCode, users[0].uid)).rejects.toThrow(/game in progress/i);
    });

    it("should handle odd number of players (extra goes to red)", async () => {
      const roomCode = generateTestRoomCode();
      const db = getTestDb();

      const users = await Promise.all([
        createTestUser(), createTestUser(), createTestUser(),
        createTestUser(), createTestUser(),
      ]);

      for (let i = 0; i < users.length; i++) {
        await joinRoom(roomCode, users[i].uid, `Player${i + 1}`, "🐱");
        await waitFor(async () => {
          const snap = await get(ref(db, `rooms/${roomCode}/players/${users[i].uid}`));
          return snap.exists();
        }, 2000, 50);
      }

      await randomizeTeams(roomCode, users[0].uid);

      const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
      const players = playersSnap.val();

      const redPlayers = Object.values(players).filter((p: any) => p.team === "red");
      const bluePlayers = Object.values(players).filter((p: any) => p.team === "blue");

      expect(redPlayers.length).toBe(3);
      expect(bluePlayers.length).toBe(2);
    });
  });

  describe("Room Locking", () => {
    it("should lock room and reject new players", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: ownerId } = await createTestUser();
      const { uid: newPlayerId } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, ownerId, "Owner", "🐱");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${ownerId}`));
        return snap.exists();
      }, 2000, 50);

      await setRoomLocked(roomCode, ownerId, true);

      const roomSnap = await get(ref(db, `rooms/${roomCode}`));
      expect(roomSnap.val().locked).toBe(true);

      await expect(joinRoom(roomCode, newPlayerId, "NewPlayer", "🐶")).rejects.toThrow(/locked/i);
    });

    it("should allow existing players to rejoin locked room", async () => {
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

      await setRoomLocked(roomCode, ownerId, true);
      await leaveRoom(roomCode, playerId);

      await joinRoom(roomCode, playerId, "Player2", "🐶");

      const playerSnap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
      expect(playerSnap.exists()).toBe(true);
      expect(playerSnap.val().connected).toBe(true);
    });

    it("should unlock room and allow new players", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: ownerId } = await createTestUser();
      const { uid: newPlayerId } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, ownerId, "Owner", "🐱");
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${ownerId}`));
        return snap.exists();
      }, 2000, 50);

      await setRoomLocked(roomCode, ownerId, true);
      await setRoomLocked(roomCode, ownerId, false);

      const roomSnap = await get(ref(db, `rooms/${roomCode}`));
      expect(roomSnap.val().locked).toBe(false);

      await joinRoom(roomCode, newPlayerId, "NewPlayer", "🐶");

      const playerSnap = await get(ref(db, `rooms/${roomCode}/players/${newPlayerId}`));
      expect(playerSnap.exists()).toBe(true);
    });

    it("should reject non-owner trying to lock room", async () => {
      const roomCode = generateTestRoomCode();
      const { uid: ownerId } = await createTestUser();
      const { uid: playerId } = await createTestUser();
      const db = getTestDb();

      await joinRoom(roomCode, ownerId, "Owner", "🐱");
      await joinRoom(roomCode, playerId, "Player2", "🐶");

      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
        return snap.exists();
      }, 2000, 50);

      await expect(setRoomLocked(roomCode, playerId, true)).rejects.toThrow(/not room owner/i);
    });
  });
});
