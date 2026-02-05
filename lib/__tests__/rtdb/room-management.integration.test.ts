/**
 * Integration tests for lib/rtdb/room-management.ts
 * Tests: room creation, joining, leaving, player connection, owner transfer.
 */

import { describe, it, expect } from "vitest";
import { ref, get, update } from "firebase/database";
import {
  createTestUser,
  generateTestRoomCode,
  waitFor,
  getTestDb,
} from "../setup/firebase-test-utils";
import { setupIntegrationSuite } from "../setup/integration-helpers";
import {
  joinRoom,
  leaveRoom,
  reassignOwnerIfNeeded,
  OWNER_DISCONNECT_GRACE_PERIOD_MS,
} from "../../rtdb";

describe("rtdb – room-management", () => {
  setupIntegrationSuite();

  describe("Room Creation & Joining", () => {
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
      await waitFor(async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${uid1}`));
        return snap.exists();
      }, 2000, 50);

      await joinRoom(roomCode, uid2, "Player2", "🐶");
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
      expect(player.team).toBeUndefined();
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

      if (player) {
        expect(player.connected).toBe(false);
      } else {
        expect(player).toBeNull();
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

      const roomBefore = await get(ref(db, `rooms/${roomCode}`));
      expect(roomBefore.val().ownerId).toBe(ownerId);

      // Simulate owner disconnect with old timestamp
      const pastTime = Date.now() - OWNER_DISCONNECT_GRACE_PERIOD_MS - 1000;
      await update(ref(db, `rooms/${roomCode}/players/${ownerId}`), {
        connected: false,
        lastSeen: pastTime,
      });

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

      const recentTime = Date.now() - 1000;
      await update(ref(db, `rooms/${roomCode}/players/${ownerId}`), {
        connected: false,
        lastSeen: recentTime,
      });

      const result = await reassignOwnerIfNeeded(roomCode);

      expect(result.withinGracePeriod).toBe(true);
      expect(result.newOwnerName).toBe(null);

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

      await leaveRoom(roomCode, ownerId);

      const roomAfter = await get(ref(db, `rooms/${roomCode}`));
      expect(roomAfter.val().ownerId).toBe(playerId);
    });
  });
});
