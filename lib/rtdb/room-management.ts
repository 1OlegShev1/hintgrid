/**
 * Room management: join, leave, disconnect behavior, owner reassignment, delete.
 */

import {
  ref, get, set, update, remove, push,
  serverTimestamp, onDisconnect,
  DatabaseReference,
} from "firebase/database";
import { getDb, pushSystemMessage, type RoomData, type PlayerData } from "./helpers";
import { updatePublicRoomIndex, removeFromPublicRoomIndex } from "./public-rooms";
import type { Team } from "@/shared/types";
import {
  DEFAULT_TIMER_PRESET,
  DEFAULT_WORD_PACK,
  DEFAULT_VISIBILITY,
  MAX_PLAYERS_DEFAULT,
  BAN_DURATION_MS,
} from "@/shared/constants";
import { sanitizePlayerName } from "@/shared/validation";

// Grace period before transferring ownership (in milliseconds)
// Allows for page refreshes, network switches (WiFi → mobile), etc.
// Kept short (30s) to avoid game stalls when owner disconnects
export const OWNER_DISCONNECT_GRACE_PERIOD_MS = 30 * 1000; // 30 seconds

export interface ReassignResult {
  /** New owner's name if reassigned */
  newOwnerName: string | null;
  /** If true, owner is disconnected but within grace period - caller should retry later */
  withinGracePeriod: boolean;
  /** Milliseconds remaining in grace period (only if withinGracePeriod is true) */
  gracePeriodRemainingMs: number;
}

/**
 * Join a room. Sets up onDisconnect to handle cleanup when player leaves.
 * Returns the onDisconnect reference so the caller can cancel it if needed.
 * @param visibility - Optional visibility for new rooms (default: public)
 */
export async function joinRoom(
  roomCode: string,
  playerId: string,
  playerName: string,
  playerAvatar: string,
  visibility?: "public" | "private"
): Promise<{ disconnectRef: DatabaseReference }> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  // Sanitize player name
  const sanitizedName = sanitizePlayerName(playerName);
  if (!sanitizedName) throw new Error("Invalid player name");

  const roomSnap = await get(roomRef);

  if (!roomSnap.exists()) {
    // Create new room
    const startingTeam: Team = Math.random() < 0.5 ? "red" : "blue";
    await set(roomRef, {
      ownerId: playerId,
      currentTeam: startingTeam,
      startingTeam,
      wordPack: DEFAULT_WORD_PACK,
      currentClue: null,
      remainingGuesses: null,
      turnStartTime: null,
      timerPreset: DEFAULT_TIMER_PRESET,
      redHasGivenClue: false,
      blueHasGivenClue: false,
      gameStarted: false,
      gameOver: false,
      winner: null,
      paused: false,
      pauseReason: null,
      pausedForTeam: null,
      locked: false,
      // Public rooms feature
      visibility: visibility || DEFAULT_VISIBILITY,
      maxPlayers: MAX_PLAYERS_DEFAULT,
      // roomName is optional - auto-generated from owner name in client
      createdAt: serverTimestamp(),
      board: [],
    });
  } else {
    // Room exists - check lock status FIRST before anything else
    const roomData = roomSnap.val() as RoomData;
    const playersSnap = await get(playersRef);
    const players = (playersSnap.val() || {}) as Record<string, PlayerData>;
    
    // Check if player is banned (temporary ban with expiry)
    const banExpiry = roomData.bannedPlayers?.[playerId];
    if (banExpiry && banExpiry > Date.now()) {
      const remainingSecs = Math.ceil((banExpiry - Date.now()) / 1000);
      throw new Error(`You are temporarily banned from this room (${remainingSecs}s remaining)`);
    }
    
    // Check if room is locked (existing players can still rejoin)
    const existingPlayer = players[playerId];
    if (roomData.locked === true && !existingPlayer) {
      throw new Error("Room is locked");
    }
    
    // Check if room is at max capacity (existing players can still rejoin)
    const maxPlayers = roomData.maxPlayers || MAX_PLAYERS_DEFAULT;
    const connectedCount = Object.values(players).filter(p => p.connected).length;
    if (!existingPlayer && connectedCount >= maxPlayers) {
      throw new Error("Room is full");
    }
    
    // Check if another connected player has the same name
    const duplicateName = Object.entries(players).find(
      ([id, p]) => id !== playerId && p.name.toLowerCase() === sanitizedName.toLowerCase() && p.connected
    );
    if (duplicateName) {
      throw new Error("Name already taken");
    }
  }

  // Check if this player already exists (rejoining)
  const existingPlayerSnap = await get(playerRef);
  
  if (existingPlayerSnap.exists()) {
    // Rejoin - preserve team/role, update name/avatar and connection status
    await update(playerRef, {
      name: sanitizedName,
      avatar: playerAvatar,
      connected: true,
      lastSeen: serverTimestamp(),
    });
  } else {
    // New player
    await set(playerRef, {
      name: sanitizedName,
      avatar: playerAvatar,
      team: null,
      role: null,
      connected: true,
      lastSeen: serverTimestamp(),
    });
  }

  // Set up initial onDisconnect - marks player as disconnected
  // This will be updated dynamically when player count changes
  const playerDisconnect = onDisconnect(playerRef);
  await playerDisconnect.update({
    connected: false,
    lastSeen: serverTimestamp(),
  });
  
  // Update public room index (player count changed)
  // Need to re-fetch room data since we may have created it
  const updatedRoomSnap = await get(roomRef);
  const updatedPlayersSnap = await get(playersRef);
  if (updatedRoomSnap.exists()) {
    const updatedRoomData = updatedRoomSnap.val() as RoomData;
    const updatedPlayers = (updatedPlayersSnap.val() || {}) as Record<string, PlayerData>;
    // Fire and forget - don't block join on index update
    updatePublicRoomIndex(roomCode, updatedRoomData, updatedPlayers).catch(() => {});
  }

  return { disconnectRef: playerRef };
}

/**
 * Update onDisconnect behavior based on whether this player is the last one.
 * Call this whenever the player list changes.
 * - If last connected player AND owner: onDisconnect deletes the entire room
 * - Otherwise: onDisconnect just marks this player disconnected
 * 
 * NOTE: Only the owner can set up room-level onDisconnect (permission requirement).
 * Non-owners always just mark themselves as disconnected.
 */
export async function updateDisconnectBehavior(
  roomCode: string,
  playerId: string,
  connectedCount: number
): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);

  // Check if this player is the owner
  const roomSnap = await get(roomRef);
  const isOwner = roomSnap.exists() && roomSnap.val().ownerId === playerId;

  // ALWAYS set player-level disconnect handler - this ensures cleanup even if 
  // room-level handler fails (e.g., WebSocket closes ungracefully)
  await onDisconnect(playerRef).update({
    connected: false,
    lastSeen: serverTimestamp(),
  });

  // Additionally handle room deletion for owner when they're the last player
  if (connectedCount <= 1 && isOwner) {
    // Set up room deletion - if this fires, it removes everything including players
    // If it doesn't fire (network issues), at least player-level handler above
    // will mark us as disconnected so cleanup script can delete the room later
    await onDisconnect(roomRef).remove();
    
    // Also remove from public room index on disconnect
    // Security rules allow any authenticated user to delete orphaned entries
    // (when the room doesn't exist)
    const publicRoomRef = ref(db, `publicRooms/${roomCode}`);
    await onDisconnect(publicRoomRef).remove();
  } else if (isOwner) {
    // Owner but others are connected - cancel room-level handler if we had one
    await onDisconnect(roomRef).cancel();
  }
}

/**
 * Check if the room owner is disconnected and reassign to another connected player.
 * Returns information about the result, including whether we're within grace period.
 * 
 * @param addMessage - Whether to add a system message. Set to false when called
 *                     from listeners to avoid duplicate messages from race conditions.
 * @param skipGracePeriod - If true, skip the grace period check (used when owner explicitly leaves)
 */
export async function reassignOwnerIfNeeded(
  roomCode: string,
  addMessage: boolean = false,
  skipGracePeriod: boolean = false
): Promise<ReassignResult> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const [roomSnap, playersSnap] = await Promise.all([get(roomRef), get(playersRef)]);
  if (!roomSnap.exists() || !playersSnap.exists()) {
    return { newOwnerName: null, withinGracePeriod: false, gracePeriodRemainingMs: 0 };
  }

  const roomData = roomSnap.val() as RoomData;
  const players = playersSnap.val() as Record<string, PlayerData>;
  
  // Check if current owner is disconnected
  // connected !== false treats undefined as connected (backwards compatible)
  const currentOwner = players[roomData.ownerId];
  if (currentOwner?.connected !== false) {
    return { newOwnerName: null, withinGracePeriod: false, gracePeriodRemainingMs: 0 };
  }
  
  // Check grace period - only transfer if owner has been disconnected long enough
  // This prevents accidental transfers during page refreshes or network switches
  if (!skipGracePeriod && currentOwner?.lastSeen) {
    const disconnectedFor = Date.now() - currentOwner.lastSeen;
    if (disconnectedFor < OWNER_DISCONNECT_GRACE_PERIOD_MS) {
      const remaining = OWNER_DISCONNECT_GRACE_PERIOD_MS - disconnectedFor;
      return { newOwnerName: null, withinGracePeriod: true, gracePeriodRemainingMs: remaining };
    }
  }
  
  // Find first connected player to become new owner
  const newOwnerEntry = Object.entries(players).find(([, p]) => p.connected !== false);
  if (!newOwnerEntry) {
    return { newOwnerName: null, withinGracePeriod: false, gracePeriodRemainingMs: 0 };
  }
  
  const [newOwnerId, newOwnerData] = newOwnerEntry;
  if (newOwnerId === roomData.ownerId) {
    return { newOwnerName: null, withinGracePeriod: false, gracePeriodRemainingMs: 0 };
  }
  
  // Reassign ownership
  await update(roomRef, { ownerId: newOwnerId });
  
  // Only add message when explicitly requested (from leaveRoom, not from listeners)
  if (addMessage) {
    await pushSystemMessage(roomCode, `${newOwnerData.name} is now the room owner.`);
  }
  
  return { newOwnerName: newOwnerData.name, withinGracePeriod: false, gracePeriodRemainingMs: 0 };
}

/**
 * Leave room explicitly. Checks if last player and deletes room if so.
 */
export async function leaveRoom(roomCode: string, playerId: string): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const playersSnap = await get(playersRef);
  if (!playersSnap.exists()) {
    await remove(roomRef);
    return;
  }

  const players = playersSnap.val() as Record<string, PlayerData>;
  // connected !== false treats undefined as connected (backwards compatible)
  const connectedCount = Object.entries(players).filter(
    ([id, p]) => id !== playerId && p.connected !== false
  ).length;

  if (connectedCount === 0) {
    // Last player leaving - delete the room and remove from public index
    await Promise.all([
      remove(roomRef),
      removeFromPublicRoomIndex(roomCode),
    ]);
  } else {
    // Mark as disconnected
    await update(playerRef, { connected: false, lastSeen: serverTimestamp() });
    
    // Clear this player's votes from all cards (they have permission to remove their own votes)
    const roomSnap = await get(roomRef);
    if (roomSnap.exists()) {
      const roomData = roomSnap.val() as RoomData;
      const board = roomData.board || [];
      // Remove votes individually - player can only remove their own vote
      const voteRemovals = board.map((_, index) => 
        remove(ref(db, `rooms/${roomCode}/board/${index}/votes/${playerId}`))
      );
      await Promise.all(voteRemovals);
    }
    
    // Reassign owner if the leaving player was the owner (add message since this is explicit leave)
    // Skip grace period since this is an explicit leave action
    await reassignOwnerIfNeeded(roomCode, true, true);
    
    // Update public room index (player count changed)
    const updatedRoomSnap = await get(roomRef);
    const updatedPlayersSnap = await get(playersRef);
    if (updatedRoomSnap.exists()) {
      const updatedRoomData = updatedRoomSnap.val() as RoomData;
      const updatedPlayers = (updatedPlayersSnap.val() || {}) as Record<string, PlayerData>;
      updatePublicRoomIndex(roomCode, updatedRoomData, updatedPlayers).catch(() => {});
    }
  }
}

/**
 * Delete a room entirely.
 */
export async function deleteRoom(roomCode: string): Promise<void> {
  const db = getDb();
  await remove(ref(db, `rooms/${roomCode}`));
}
