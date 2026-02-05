/**
 * Shared helpers for integration tests.
 * Provides common setup/teardown and game initialization utilities.
 */

import { ref, get } from "firebase/database";
import {
  initializeTestFirebase,
  cleanupTestData,
  cleanupTestFirebase,
  createTestUser,
  waitFor,
  getTestDb,
} from "./firebase-test-utils";
import { enableTestMode, disableTestMode } from "../../firebase";
import { joinRoom, setLobbyRole } from "../../rtdb";
import { beforeAll, afterAll, beforeEach } from "vitest";

/**
 * Call inside a describe() block to wire up Firebase emulator
 * init, cleanup, and per-test data wipe.
 */
export function setupIntegrationSuite() {
  beforeAll(async () => {
    const { db } = await initializeTestFirebase();
    enableTestMode(db);
  });

  afterAll(async () => {
    await cleanupTestData();
    disableTestMode();
    await cleanupTestFirebase();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });
}

/**
 * Helper function for setting up a game with 4 players (2 per team).
 * Returns the four user objects.
 *
 * Layout:
 *   users[0] → red clueGiver
 *   users[1] → red guesser
 *   users[2] → blue clueGiver
 *   users[3] → blue guesser
 */
export async function setupGameWith4Players(roomCode: string) {
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
    await waitFor(
      async () => {
        const snap = await get(ref(db, `rooms/${roomCode}/players/${users[i].uid}`));
        return snap.exists();
      },
      2000,
      50
    );
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
