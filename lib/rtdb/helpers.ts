/**
 * Shared internal helpers for rtdb modules.
 */

import {
  ref,
  get,
  remove,
  push,
  onValue,
  off,
  serverTimestamp,
  DatabaseReference,
  type DataSnapshot,
} from "firebase/database";
import { getDatabase } from "../firebase";
import type {
  Team,
  PauseReason,
  FirebaseBoardCard,
  FirebasePlayerData,
  FirebaseMessageData,
  FirebaseRoomData,
} from "@/shared/types";

// Re-export type aliases for internal use across modules
export type BoardCard = FirebaseBoardCard;
export type RoomData = FirebaseRoomData;
export type PlayerData = FirebasePlayerData;
export type MessageData = FirebaseMessageData;

export function getDb() {
  const db = getDatabase();
  if (!db) throw new Error("Database not initialized");
  return db;
}

/**
 * Get server-adjusted current time using Firebase's .info/serverTimeOffset.
 * This accounts for clock skew between client and server, making time-based
 * checks (like ban expiry) resistant to clients with incorrect clocks.
 * Uses a one-shot onValue listener since .info/ paths are client-local
 * and don't support get().
 */
export function getServerTime(): Promise<number> {
  try {
    const db = getDb();
    const offsetRef = ref(db, ".info/serverTimeOffset");
    return new Promise((resolve) => {
      // Use off() to detach instead of the unsubscribe return value,
      // because onValue can fire synchronously before the return value is assigned.
      const callback = (snap: DataSnapshot) => {
        off(offsetRef, "value", callback);
        const offset = (snap.val() as number) || 0;
        resolve(Date.now() + offset);
      };
      onValue(offsetRef, callback);
    });
  } catch {
    // Fallback if .info paths are unavailable (e.g., some test environments)
    return Promise.resolve(Date.now());
  }
}

/**
 * Check if a team can play (for pause logic).
 * connected !== false treats undefined as connected (backwards compatible)
 */
export function checkPause(
  players: Record<string, PlayerData>,
  team: "red" | "blue",
  hasClue: boolean
): { paused: boolean; reason: PauseReason; team: Team | null } {
  const teamPlayers = Object.values(players).filter((p) => p.team === team);
  const hasClueGiver = teamPlayers.some((p) => p.role === "clueGiver" && p.connected !== false);
  const hasGuesser = teamPlayers.some((p) => p.role === "guesser" && p.connected !== false);
  const anyConnected = teamPlayers.some((p) => p.connected !== false);

  if (!anyConnected) return { paused: true, reason: "teamDisconnected", team };
  if (!hasClue && !hasClueGiver) return { paused: true, reason: "clueGiverDisconnected", team };
  if (hasClue && !hasGuesser) return { paused: true, reason: "noGuessers", team };
  return { paused: false, reason: null, team: null };
}

/** Convert votes object to array of player IDs */
export function votesToArray(votes: Record<string, boolean> | undefined): string[] {
  if (!votes) return [];
  return Object.keys(votes).filter((id) => votes[id]);
}

/** Convert array to votes object */
export function arrayToVotes(arr: string[]): Record<string, boolean> {
  const obj: Record<string, boolean> = {};
  arr.forEach((id) => { obj[id] = true; });
  return obj;
}

/**
 * Clear game-related messages (keep chat and user system messages).
 * Used by both startGame and rematch.
 */
export async function clearGameMessages(
  roomCode: string,
  messagesData: Record<string, MessageData>
): Promise<void> {
  const db = getDb();
  const gameMessageTypes = ["clue", "reveal", "game-system"];
  const isGameMessage = (msg: MessageData) => {
    if (gameMessageTypes.includes(msg.type)) return true;
    // Old-format reveal messages were type "system" with "revealed" in message
    if (msg.type === "system" && msg.message.includes("revealed")) return true;
    return false;
  };
  const deletePromises = Object.entries(messagesData)
    .filter(([, msg]) => isGameMessage(msg))
    .map(([id]) => remove(ref(db, `rooms/${roomCode}/messages/${id}`)));
  await Promise.all(deletePromises);
}

/** Push a system message to a room. */
export async function pushSystemMessage(
  roomCode: string,
  message: string,
  type: "system" | "game-system" = "system"
): Promise<void> {
  const db = getDb();
  await push(ref(db, `rooms/${roomCode}/messages`), {
    playerId: null,
    playerName: "System",
    message,
    timestamp: serverTimestamp(),
    type,
  });
}

/**
 * Get a Firebase database reference for a room path.
 */
export function roomRef(roomCode: string, ...pathParts: string[]): DatabaseReference {
  const db = getDb();
  const fullPath = pathParts.length > 0
    ? `rooms/${roomCode}/${pathParts.join("/")}`
    : `rooms/${roomCode}`;
  return ref(db, fullPath);
}
