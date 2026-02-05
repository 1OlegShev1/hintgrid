/**
 * Integration tests for lib/rtdb/chat.ts
 * Tests: sendMessage, pruneOldMessages.
 */

import { describe, it, expect } from "vitest";
import { ref, get, set, push } from "firebase/database";
import {
  createTestUser,
  generateTestRoomCode,
  waitFor,
  getTestDb,
} from "../setup/firebase-test-utils";
import { setupIntegrationSuite } from "../setup/integration-helpers";
import { joinRoom, pruneOldMessages } from "../../rtdb";

describe("rtdb – chat (message pruning)", () => {
  setupIntegrationSuite();

  it("should prune messages when exceeding threshold", async () => {
    const roomCode = generateTestRoomCode();
    const { uid: playerId } = await createTestUser();
    const db = getTestDb();

    await joinRoom(roomCode, playerId, "Chatter", "🐱");
    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
      return snap.exists();
    }, 2000, 50);

    const messagesRef = ref(db, `rooms/${roomCode}/messages`);

    const messagePromises = [];
    for (let i = 0; i < 410; i++) {
      messagePromises.push(
        set(push(messagesRef), {
          playerId,
          playerName: "Chatter",
          message: `Message ${i}`,
          timestamp: i,
          type: "chat",
        })
      );
    }
    await Promise.all(messagePromises);

    let messagesSnap = await get(messagesRef);
    expect(Object.keys(messagesSnap.val()).length).toBe(410);

    const pruned = await pruneOldMessages(roomCode);

    expect(pruned).toBe(110);

    messagesSnap = await get(messagesRef);
    expect(Object.keys(messagesSnap.val()).length).toBe(300);
  });

  it("should not prune when below threshold", async () => {
    const roomCode = generateTestRoomCode();
    const { uid: playerId } = await createTestUser();
    const db = getTestDb();

    await joinRoom(roomCode, playerId, "Chatter", "🐱");
    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
      return snap.exists();
    }, 2000, 50);

    const messagesRef = ref(db, `rooms/${roomCode}/messages`);

    for (let i = 0; i < 50; i++) {
      await set(push(messagesRef), {
        playerId,
        playerName: "Chatter",
        message: `Message ${i}`,
        timestamp: Date.now() + i,
        type: "chat",
      });
    }

    const pruned = await pruneOldMessages(roomCode);

    expect(pruned).toBe(0);

    const messagesSnap = await get(messagesRef);
    expect(Object.keys(messagesSnap.val()).length).toBe(50);
  });

  it("should delete oldest messages first", async () => {
    const roomCode = generateTestRoomCode();
    const { uid: playerId } = await createTestUser();
    const db = getTestDb();

    await joinRoom(roomCode, playerId, "Chatter", "🐱");
    await waitFor(async () => {
      const snap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
      return snap.exists();
    }, 2000, 50);

    const messagesRef = ref(db, `rooms/${roomCode}/messages`);

    for (let i = 0; i < 410; i++) {
      await set(push(messagesRef), {
        playerId,
        playerName: "Chatter",
        message: `Message ${i}`,
        timestamp: i,
        type: "chat",
      });
    }

    await pruneOldMessages(roomCode);

    const messagesSnap = await get(messagesRef);
    const remaining = Object.values(messagesSnap.val()) as any[];
    const timestamps = remaining.map((m) => m.timestamp).sort((a: number, b: number) => a - b);

    expect(timestamps[0]).toBe(110);
    expect(timestamps[timestamps.length - 1]).toBe(409);
  });
});
