/**
 * Integration tests for lib/rtdb/maintenance.ts
 * Tests: pruneStalePlayers.
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
  giveClue,
  voteCard,
  pruneStalePlayers,
} from "../../rtdb";
import { STALE_PLAYER_GRACE_MS } from "@/shared/constants";

describe("rtdb – maintenance (stale player cleanup)", () => {
  setupIntegrationSuite();

  it("should demote stale players to spectators", async () => {
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

    await setLobbyRole(roomCode, playerId, "red", "guesser");

    const staleTime = Date.now() - STALE_PLAYER_GRACE_MS - 1000;
    await update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
      connected: false,
      lastSeen: staleTime,
    });

    const pruned = await pruneStalePlayers(roomCode, ownerId, STALE_PLAYER_GRACE_MS);

    expect(pruned).toContain(playerId);

    const playerSnap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
    expect(playerSnap.val().team).toBeUndefined();
    expect(playerSnap.val().role).toBeUndefined();
  });

  it("should not demote players within grace period", async () => {
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

    await setLobbyRole(roomCode, playerId, "red", "guesser");

    const recentTime = Date.now() - 1000;
    await update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
      connected: false,
      lastSeen: recentTime,
    });

    const pruned = await pruneStalePlayers(roomCode, ownerId, STALE_PLAYER_GRACE_MS);

    expect(pruned).not.toContain(playerId);

    const playerSnap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
    expect(playerSnap.val().team).toBe("red");
    expect(playerSnap.val().role).toBe("guesser");
  });

  it("should clear stale player votes from board", async () => {
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

    let votesBefore = await get(ref(db, `rooms/${roomCode}/board/5/votes`));
    expect(votesBefore.val()?.[guesserId]).toBe(true);

    const staleTime = Date.now() - STALE_PLAYER_GRACE_MS - 1000;
    await update(ref(db, `rooms/${roomCode}/players/${guesserId}`), {
      connected: false,
      lastSeen: staleTime,
    });

    await pruneStalePlayers(roomCode, users[0].uid, STALE_PLAYER_GRACE_MS);

    const votesAfter = await get(ref(db, `rooms/${roomCode}/board/5/votes`));
    expect(votesAfter.val()?.[guesserId]).toBeUndefined();
  });

  it("should add system message when players are demoted", async () => {
    const roomCode = generateTestRoomCode();
    const { uid: ownerId } = await createTestUser();
    const { uid: playerId } = await createTestUser();
    const db = getTestDb();

    await joinRoom(roomCode, ownerId, "Owner", "🐱");
    await joinRoom(roomCode, playerId, "StalePerson", "🐶");

    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
      return snap.exists();
    }, 2000, 50);

    await setLobbyRole(roomCode, playerId, "blue", "clueGiver");

    const staleTime = Date.now() - STALE_PLAYER_GRACE_MS - 1000;
    await update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
      connected: false,
      lastSeen: staleTime,
    });

    await pruneStalePlayers(roomCode, ownerId, STALE_PLAYER_GRACE_MS);

    const messagesSnap = await get(ref(db, `rooms/${roomCode}/messages`));
    const messages = messagesSnap.val();
    const messageValues = Object.values(messages) as any[];

    const demotedMessage = messageValues.find(
      (m) => m.type === "system" && m.message.includes("StalePerson") && m.message.includes("spectators")
    );
    expect(demotedMessage).toBeDefined();
  });

  it("should reject non-owner trying to prune stale players", async () => {
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

    await expect(pruneStalePlayers(roomCode, playerId, STALE_PLAYER_GRACE_MS)).rejects.toThrow(/not room owner/i);
  });
});
