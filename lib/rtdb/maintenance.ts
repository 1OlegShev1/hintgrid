/**
 * Maintenance: stale player cleanup.
 */

import {
  ref, get, update, push,
  serverTimestamp,
} from "firebase/database";
import { getDb, getServerTime, votesToArray, arrayToVotes, type RoomData, type PlayerData } from "./helpers";

export async function pruneStalePlayers(
  roomCode: string,
  requesterId: string,
  graceMs: number
): Promise<string[]> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const [roomSnap, playersSnap] = await Promise.all([get(roomRef), get(playersRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== requesterId) throw new Error("Not room owner");

  const players = (playersSnap.val() || {}) as Record<string, PlayerData>;
  // Use server-adjusted time to prevent stale player checks from being skewed by client clocks
  const now = await getServerTime();

  // Find stale players who are disconnected beyond grace period AND have a team/role
  const stalePlayers: { id: string; name: string }[] = [];

  Object.entries(players).forEach(([id, p]) => {
    if (p.connected === true) return;
    if (!p.lastSeen || now - p.lastSeen >= graceMs) {
      // Only count as stale if they have a team or role to clear
      // Use != null (loose) to also match undefined (Firebase deletes fields set to null)
      if (p.team != null || p.role != null) {
        stalePlayers.push({ id, name: p.name });
      }
    }
  });

  if (stalePlayers.length === 0) return [];

  const updates: Record<string, any> = {};

  // Clear team/role for stale players so they no longer block readiness/roles
  stalePlayers.forEach(({ id }) => {
    const player = players[id];
    if (!player) return;
    if (player.team != null) updates[`players/${id}/team`] = null;
    if (player.role != null) updates[`players/${id}/role`] = null;
  });

  // Remove stale votes from board (if any)
  const staleIds = new Set(stalePlayers.map((p) => p.id));
  const board = roomData.board || [];
  let boardChanged = false;
  const updatedBoard = board.map((card) => {
    if (!card.votes) return card;
    const votes = votesToArray(card.votes);
    const filteredVotes = votes.filter((id) => !staleIds.has(id));
    if (filteredVotes.length === votes.length) return card;
    boardChanged = true;
    return { ...card, votes: arrayToVotes(filteredVotes) };
  });

  if (boardChanged) {
    updates.board = updatedBoard;
  }

  if (Object.keys(updates).length > 0) {
    await update(roomRef, updates);
  }

  // Add system message for demoted players (batched to avoid spam)
  if (stalePlayers.length > 0) {
    const names = stalePlayers.map((p) => p.name).join(", ");
    const message = `${names} moved to spectators (disconnected)`;
    await push(ref(db, `rooms/${roomCode}/messages`), {
      playerId: null,
      playerName: "System",
      message,
      timestamp: serverTimestamp(),
      type: "system",
    });
  }

  return stalePlayers.map((p) => p.id);
}
