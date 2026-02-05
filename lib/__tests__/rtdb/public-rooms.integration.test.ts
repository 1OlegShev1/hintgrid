/**
 * Integration tests for lib/rtdb/public-rooms.ts
 * Tests: updatePublicRoomIndex, removeFromPublicRoomIndex, getPublicRooms.
 */

import { describe, it, expect } from "vitest";
import { ref, get, set } from "firebase/database";
import {
  createTestUser,
  generateTestRoomCode,
  waitFor,
  getTestDb,
} from "../setup/firebase-test-utils";
import { setupIntegrationSuite, setupGameWith4Players } from "../setup/integration-helpers";
import {
  joinRoom,
  setRoomLocked,
  startGame,
  pauseGame,
  getPublicRooms,
} from "../../rtdb";

describe("rtdb – public-rooms", () => {
  setupIntegrationSuite();

  it("should add public room to index", async () => {
    const roomCode = generateTestRoomCode();
    const { uid: ownerId } = await createTestUser();
    const db = getTestDb();

    await joinRoom(roomCode, ownerId, "Owner", "🐱", "public");
    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${ownerId}`));
      return snap.exists();
    }, 2000, 50);

    const publicSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(publicSnap.exists()).toBe(true);
    expect(publicSnap.val().ownerName).toBe("Owner");
    expect(publicSnap.val().playerCount).toBe(1);
    expect(publicSnap.val().status).toBe("lobby");
  });

  it("should not add private room to index", async () => {
    const roomCode = generateTestRoomCode();
    const { uid: ownerId } = await createTestUser();
    const db = getTestDb();

    await joinRoom(roomCode, ownerId, "Owner", "🐱", "private");
    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${ownerId}`));
      return snap.exists();
    }, 2000, 50);

    const publicSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(publicSnap.exists()).toBe(false);
  });

  it("should remove locked room from public index", async () => {
    const roomCode = generateTestRoomCode();
    const { uid: ownerId } = await createTestUser();
    const db = getTestDb();

    await joinRoom(roomCode, ownerId, "Owner", "🐱", "public");
    await waitFor(async () => {
      const snap = await get(ref(db, `publicRooms/${roomCode}`));
      return snap.exists();
    }, 2000, 50);

    await setRoomLocked(roomCode, ownerId, true);

    const publicSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(publicSnap.exists()).toBe(false);
  });

  it("should re-add unlocked room to public index", async () => {
    const roomCode = generateTestRoomCode();
    const { uid: ownerId } = await createTestUser();
    const db = getTestDb();

    await joinRoom(roomCode, ownerId, "Owner", "🐱", "public");
    await waitFor(async () => {
      const snap = await get(ref(db, `publicRooms/${roomCode}`));
      return snap.exists();
    }, 2000, 50);

    await setRoomLocked(roomCode, ownerId, true);

    let publicSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(publicSnap.exists()).toBe(false);

    await setRoomLocked(roomCode, ownerId, false);

    publicSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(publicSnap.exists()).toBe(true);
  });

  it("should update player count in public index", async () => {
    const roomCode = generateTestRoomCode();
    const { uid: ownerId } = await createTestUser();
    const { uid: player2Id } = await createTestUser();
    const db = getTestDb();

    await joinRoom(roomCode, ownerId, "Owner", "🐱", "public");
    await waitFor(async () => {
      const snap = await get(ref(db, `publicRooms/${roomCode}`));
      return snap.exists();
    }, 2000, 50);

    let publicSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(publicSnap.val().playerCount).toBe(1);

    await joinRoom(roomCode, player2Id, "Player2", "🐶");
    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${player2Id}`));
      return snap.exists();
    }, 2000, 50);

    publicSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(publicSnap.val().playerCount).toBe(2);
  });

  it("should update status when game starts", async () => {
    const roomCode = generateTestRoomCode();
    const users = await setupGameWith4Players(roomCode);
    const db = getTestDb();

    let publicSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(publicSnap.val().status).toBe("lobby");

    await startGame(roomCode, users[0].uid);

    await waitFor(async () => {
      const snap = await get(ref(db, `publicRooms/${roomCode}`));
      return snap.val()?.status === "playing";
    }, 2000, 50);

    publicSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(publicSnap.val().status).toBe("playing");
  });

  it("should update status when game paused", async () => {
    const roomCode = generateTestRoomCode();
    const users = await setupGameWith4Players(roomCode);
    const db = getTestDb();

    await startGame(roomCode, users[0].uid);
    await pauseGame(roomCode, users[0].uid);

    await waitFor(async () => {
      const snap = await get(ref(db, `publicRooms/${roomCode}`));
      return snap.val()?.status === "paused";
    }, 2000, 50);

    const publicSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(publicSnap.val().status).toBe("paused");
  });

  it("should clean up orphaned public room entries via getPublicRooms", async () => {
    const roomCode = generateTestRoomCode();
    const db = getTestDb();

    await set(ref(db, `publicRooms/${roomCode}`), {
      roomName: "Orphaned Room",
      ownerName: "Ghost",
      playerCount: 5,
      status: "lobby",
      timerPreset: "normal",
      createdAt: Date.now(),
    });

    let orphanSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(orphanSnap.exists()).toBe(true);

    await getPublicRooms(10);

    await waitFor(async () => {
      const snap = await get(ref(db, `publicRooms/${roomCode}`));
      return !snap.exists();
    }, 3000, 100);

    orphanSnap = await get(ref(db, `publicRooms/${roomCode}`));
    expect(orphanSnap.exists()).toBe(false);
  });
});
