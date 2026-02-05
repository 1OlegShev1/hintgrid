/**
 * Chat: send messages, reactions, message pruning.
 */

import {
  ref, get, set, remove, push,
  serverTimestamp,
} from "firebase/database";
import { getDb, type PlayerData, type MessageData } from "./helpers";
import { sanitizeChatMessage } from "@/shared/validation";

// Message limits - query limit (300) is in useRoomConnection.ts
const MESSAGE_PRUNE_THRESHOLD = 400; // Start pruning when we exceed this
const MESSAGE_PRUNE_TARGET = 300; // Prune down to this count

/**
 * Prune old messages if count exceeds threshold.
 * Keeps chat flowing without unbounded database growth.
 * Only deletes oldest messages beyond the target count.
 */
export async function pruneOldMessages(roomCode: string): Promise<number> {
  const db = getDb();
  const messagesRef = ref(db, `rooms/${roomCode}/messages`);
  
  const messagesSnap = await get(messagesRef);
  if (!messagesSnap.exists()) return 0;
  
  const messagesData = messagesSnap.val() as Record<string, MessageData>;
  const messageEntries = Object.entries(messagesData);
  
  if (messageEntries.length <= MESSAGE_PRUNE_THRESHOLD) return 0;
  
  // Sort by timestamp (oldest first) and delete excess
  const sorted = messageEntries.sort(([, a], [, b]) => (a.timestamp || 0) - (b.timestamp || 0));
  const toDelete = sorted.slice(0, messageEntries.length - MESSAGE_PRUNE_TARGET);
  
  const deletePromises = toDelete.map(([id]) => 
    remove(ref(db, `rooms/${roomCode}/messages/${id}`))
  );
  await Promise.all(deletePromises);
  
  return toDelete.length;
}

export async function sendMessage(
  roomCode: string,
  playerId: string,
  message: string,
  type: "clue" | "chat",
  /** Optional known message count — when provided, pruning triggers deterministically */
  knownMessageCount?: number
): Promise<void> {
  const sanitized = sanitizeChatMessage(message);
  if (!sanitized) throw new Error("Message cannot be empty");

  const db = getDb();
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  const playerSnap = await get(playerRef);

  if (!playerSnap.exists()) throw new Error("Player not found");
  const playerData = playerSnap.val() as PlayerData;

  await push(ref(db, `rooms/${roomCode}/messages`), {
    playerId,
    playerName: playerData.name,
    message: sanitized,
    timestamp: serverTimestamp(),
    type,
  });
  
  // Prune old messages in background (don't block the send).
  // Trigger when count approaches the prune threshold to keep growth bounded.
  const shouldPrune = knownMessageCount !== undefined
    ? knownMessageCount >= MESSAGE_PRUNE_THRESHOLD - 10 // deterministic: prune when near threshold
    : Math.random() < 0.1; // fallback: ~10% random check if count unknown
  
  if (shouldPrune) {
    pruneOldMessages(roomCode).catch((err) => {
      console.warn("[Chat] Failed to prune old messages:", err.message);
    });
  }
}

/**
 * Add a reaction to a message.
 * Each player can only have one reaction per emoji per message.
 */
export async function addReaction(
  roomCode: string,
  messageId: string,
  playerId: string,
  emoji: string
): Promise<void> {
  const db = getDb();
  const reactionRef = ref(
    db,
    `rooms/${roomCode}/messages/${messageId}/reactions/${emoji}/${playerId}`
  );
  await set(reactionRef, true);
}

/**
 * Remove a reaction from a message.
 */
export async function removeReaction(
  roomCode: string,
  messageId: string,
  playerId: string,
  emoji: string
): Promise<void> {
  const db = getDb();
  const reactionRef = ref(
    db,
    `rooms/${roomCode}/messages/${messageId}/reactions/${emoji}/${playerId}`
  );
  await remove(reactionRef);
}
