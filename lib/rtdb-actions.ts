/**
 * Realtime Database actions for the game.
 * Uses onDisconnect() for reliable room cleanup when players leave.
 */

import {
  ref, get, set, update, remove, push, serverTimestamp, onDisconnect,
  runTransaction,
  onValue,
  DatabaseReference,
  Unsubscribe,
} from "firebase/database";
import { getDatabase } from "./firebase";
import { generateBoard, assignTeams } from "@/shared/words";
import { isValidClue, teamsAreReady, shufflePlayers, getRequiredVotes } from "@/shared/game-utils";
import type {
  Player,
  Team,
  PauseReason,
  WordPack,
  FirebaseBoardCard,
  FirebasePlayerData,
  FirebaseMessageData,
  FirebaseRoomData,
} from "@/shared/types";
import {
  TIMER_PRESETS,
  TIMER_PRESET_KEYS,
  DEFAULT_TIMER_PRESET,
  WORD_PACKS,
  DEFAULT_WORD_PACK,
  MIN_PLAYERS_TO_START,
  DEFAULT_VISIBILITY,
  MAX_PLAYERS_DEFAULT,
  BAN_DURATION_MS,
  type TimerPreset,
} from "@/shared/constants";
import {
  sanitizePlayerName,
  sanitizeClue,
  sanitizeChatMessage,
  isValidClueFormat,
} from "@/shared/validation";

// Type aliases for internal use (cleaner code)
type BoardCard = FirebaseBoardCard;
type RoomData = FirebaseRoomData;
type PlayerData = FirebasePlayerData;
type MessageData = FirebaseMessageData;

function getDb() {
  const db = getDatabase();
  if (!db) throw new Error("Database not initialized");
  return db;
}

// Check if team can play (for pause logic)
// connected !== false treats undefined as connected (backwards compatible)
function checkPause(
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

// Convert votes object to array of player IDs
function votesToArray(votes: Record<string, boolean> | undefined): string[] {
  if (!votes) return [];
  return Object.keys(votes).filter((id) => votes[id]);
}

// Convert array to votes object
function arrayToVotes(arr: string[]): Record<string, boolean> {
  const obj: Record<string, boolean> = {};
  arr.forEach((id) => { obj[id] = true; });
  return obj;
}

// ============================================================================
// Room Management
// ============================================================================

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
    await push(ref(db, `rooms/${roomCode}/messages`), {
      playerId: null,
      playerName: "System",
      message: `${newOwnerData.name} is now the room owner.`,
      timestamp: serverTimestamp(),
      type: "system",
    });
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

// ============================================================================
// Game Lifecycle
// ============================================================================

export async function startGame(roomCode: string, playerId: string): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const messagesRef = ref(db, `rooms/${roomCode}/messages`);

  const [roomSnap, playersSnap, messagesSnap] = await Promise.all([
    get(roomRef),
    get(playersRef),
    get(messagesRef),
  ]);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");
  if (roomData.gameStarted) throw new Error("Game already started");

  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;
  const players = Object.entries(playersData)
    .map(([id, p]) => ({
      id,
      name: p.name,
      avatar: p.avatar || "🐱",
      team: p.team,
      role: p.role,
      connected: p.connected,
    }))
    .filter((p) => p.team && p.role) as Player[];

  if (!teamsAreReady(players)) throw new Error("Teams not ready");

  // Clear game-related messages (keep chat and user system messages)
  // Also clear old-format reveal messages (type "system" with "revealed" in message)
  const messagesData = (messagesSnap.val() || {}) as Record<string, MessageData>;
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

  // Handle both legacy single pack and new array format
  const wordPacks = roomData.wordPack 
    ? (Array.isArray(roomData.wordPack) ? roomData.wordPack : [roomData.wordPack]) 
    : DEFAULT_WORD_PACK;
  // Get custom words (defaults to empty array)
  const customWords = roomData.customWords || [];
  const boardWords = generateBoard(wordPacks, customWords);
  const startingTeam = roomData.startingTeam as "red" | "blue";
  const board: BoardCard[] = assignTeams(boardWords, startingTeam).map((c) => ({
    word: c.word,
    team: c.team,
    revealed: false,
    revealedBy: null,
    votes: {},
  }));

  await update(roomRef, {
    gameStarted: true,
    currentTeam: startingTeam,
    turnStartTime: serverTimestamp(),
    currentClue: null,
    remainingGuesses: null,
    redHasGivenClue: false,
    blueHasGivenClue: false,
    gameOver: false,
    winner: null,
    paused: false,
    pauseReason: null,
    pausedForTeam: null,
    board,
  });
  
  // Update public room index (status changed to "playing")
  const updatedRoomData = { ...roomData, gameStarted: true, gameOver: false, paused: false };
  updatePublicRoomIndex(roomCode, updatedRoomData as RoomData, playersData).catch(() => {});
}

export async function rematch(roomCode: string, playerId: string): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const messagesRef = ref(db, `rooms/${roomCode}/messages`);

  const [roomSnap, playersSnap, messagesSnap] = await Promise.all([
    get(roomRef),
    get(playersRef),
    get(messagesRef),
  ]);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");
  if (!roomData.gameOver) throw new Error("Game not over");

  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;
  const players = Object.entries(playersData)
    .map(([id, p]) => ({
      id,
      name: p.name,
      avatar: p.avatar || "🐱",
      team: p.team,
      role: p.role,
      connected: p.connected,
    }))
    .filter((p) => p.team && p.role) as Player[];

  if (!teamsAreReady(players)) throw new Error("Teams not ready");

  // Handle both legacy single pack and new array format
  const wordPacks = roomData.wordPack 
    ? (Array.isArray(roomData.wordPack) ? roomData.wordPack : [roomData.wordPack]) 
    : DEFAULT_WORD_PACK;
  // Get custom words (defaults to empty array)
  const customWords = roomData.customWords || [];
  const boardWords = generateBoard(wordPacks, customWords);
  const startingTeam: Team = Math.random() < 0.5 ? "red" : "blue";
  const board: BoardCard[] = assignTeams(boardWords, startingTeam).map((c) => ({
    word: c.word,
    team: c.team,
    revealed: false,
    revealedBy: null,
    votes: {},
  }));

  // Clear game-related messages (keep chat and user system messages)
  // Same logic as startGame() for consistency
  const messagesData = (messagesSnap.val() || {}) as Record<string, MessageData>;
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

  await update(roomRef, {
    gameStarted: true,
    currentTeam: startingTeam,
    startingTeam,
    turnStartTime: serverTimestamp(),
    currentClue: null,
    remainingGuesses: null,
    redHasGivenClue: false,
    blueHasGivenClue: false,
    gameOver: false,
    winner: null,
    paused: false,
    pauseReason: null,
    pausedForTeam: null,
    board,
  });
  
  // Update public room index (status changed to "playing")
  const updatedRoomData = { ...roomData, gameStarted: true, gameOver: false, paused: false };
  updatePublicRoomIndex(roomCode, updatedRoomData as RoomData, playersData).catch(() => {});
}

export async function endGame(roomCode: string, playerId: string): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const [roomSnap, playersSnap] = await Promise.all([get(roomRef), get(playersRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");
  if (!roomData.gameStarted) throw new Error("Game not started");

  // Reset player teams/roles
  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;
  const playerUpdates: Record<string, null> = {};
  Object.keys(playersData).forEach((id) => {
    playerUpdates[`players/${id}/team`] = null;
    playerUpdates[`players/${id}/role`] = null;
  });

  // Owner stays the same - they're just ending the game, not leaving
  await update(roomRef, {
    gameStarted: false,
    gameOver: false,
    winner: null,
    currentClue: null,
    remainingGuesses: null,
    turnStartTime: null,
    paused: false,
    pauseReason: null,
    pausedForTeam: null,
    board: [],
    ...playerUpdates,
  });

  // Add game system message
  await push(ref(db, `rooms/${roomCode}/messages`), {
    playerId: null,
    playerName: "System",
    message: "Game ended by room owner.",
    timestamp: serverTimestamp(),
    type: "game-system",
  });
  
  // Update public room index (status changed to "lobby")
  const updatedRoomData = { ...roomData, gameStarted: false, gameOver: false, paused: false };
  updatePublicRoomIndex(roomCode, updatedRoomData as RoomData, playersData).catch(() => {});
}

export async function pauseGame(roomCode: string, playerId: string): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);

  const roomSnap = await get(roomRef);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");
  if (!roomData.gameStarted || roomData.gameOver || roomData.paused) {
    throw new Error("Cannot pause: game not active");
  }

  await update(roomRef, {
    paused: true,
    pauseReason: "ownerPaused",
    pausedForTeam: roomData.currentTeam,
    turnStartTime: null, // Stop the timer
  });

  await push(ref(db, `rooms/${roomCode}/messages`), {
    playerId: null,
    playerName: "System",
    message: "Game paused by room owner.",
    timestamp: serverTimestamp(),
    type: "game-system",
  });
  
  // Update public room index (status changed to "paused")
  const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;
  const updatedRoomData = { ...roomData, paused: true };
  updatePublicRoomIndex(roomCode, updatedRoomData as RoomData, playersData).catch(() => {});
}

export async function resumeGame(roomCode: string, playerId: string): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const [roomSnap, playersSnap] = await Promise.all([get(roomRef), get(playersRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");
  if (!roomData.paused || !roomData.gameStarted || roomData.gameOver) throw new Error("Invalid game state");

  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;
  const team = roomData.currentTeam as "red" | "blue";
  const hasClueGiver = Object.values(playersData).some(
    (p) => p.team === team && p.role === "clueGiver" && p.connected
  );
  const hasGuesser = Object.values(playersData).some(
    (p) => p.team === team && p.role === "guesser" && p.connected
  );

  if (!hasClueGiver || !hasGuesser) throw new Error("Team needs clue giver and guesser");

  await update(roomRef, {
    paused: false,
    pauseReason: null,
    pausedForTeam: null,
    turnStartTime: serverTimestamp(),
  });

  await push(ref(db, `rooms/${roomCode}/messages`), {
    playerId: null,
    playerName: "System",
    message: "Game resumed.",
    timestamp: serverTimestamp(),
    type: "game-system",
  });
  
  // Update public room index (status changed to "playing")
  const updatedRoomData = { ...roomData, paused: false, pauseReason: null };
  updatePublicRoomIndex(roomCode, updatedRoomData as RoomData, playersData).catch(() => {});
}

// ============================================================================
// Lobby Actions
// ============================================================================

export async function setTimerPreset(roomCode: string, playerId: string, preset: TimerPreset): Promise<void> {
  if (!TIMER_PRESET_KEYS.includes(preset)) throw new Error("Invalid timer preset");
  
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const roomSnap = await get(roomRef);

  if (!roomSnap.exists()) throw new Error("Room not found");
  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");
  if (roomData.gameStarted) throw new Error("Game already started");

  await update(roomRef, { timerPreset: preset });
}

export async function setWordPack(roomCode: string, playerId: string, packs: WordPack[]): Promise<void> {
  // Validate all packs
  if (!packs.length) throw new Error("At least one word pack required");
  for (const pack of packs) {
    if (!WORD_PACKS.includes(pack)) throw new Error(`Invalid word pack: ${pack}`);
  }
  
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const roomSnap = await get(roomRef);

  if (!roomSnap.exists()) throw new Error("Room not found");
  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");
  if (roomData.gameStarted) throw new Error("Game already started");

  await update(roomRef, { wordPack: packs });
}

export async function setCustomWords(roomCode: string, playerId: string, customWords: string[]): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const roomSnap = await get(roomRef);

  if (!roomSnap.exists()) throw new Error("Room not found");
  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");
  if (roomData.gameStarted) throw new Error("Game already started");

  // Store custom words (validation happens client-side, we just store the array)
  await update(roomRef, { customWords: customWords.length > 0 ? customWords : null });
}

export async function setRoomLocked(roomCode: string, playerId: string, locked: boolean): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const roomSnap = await get(roomRef);

  if (!roomSnap.exists()) throw new Error("Room not found");
  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");

  await update(roomRef, { locked });
  
  // Update public room index (locked rooms should be hidden)
  if (roomData.visibility === "public") {
    if (locked) {
      await removeFromPublicRoomIndex(roomCode);
    } else {
      // Re-add to index when unlocked - pass updated roomData with locked: false
      const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
      const players = (playersSnap.val() || {}) as Record<string, PlayerData>;
      const updatedRoomData = { ...roomData, locked: false };
      await updatePublicRoomIndex(roomCode, updatedRoomData as RoomData, players);
    }
  }
}

export async function setRoomName(roomCode: string, playerId: string, roomName: string): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const [roomSnap, playersSnap] = await Promise.all([get(roomRef), get(playersRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");
  
  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");
  
  // Sanitize room name (trim, limit length)
  const sanitized = roomName.trim().slice(0, 40);
  if (!sanitized) throw new Error("Room name cannot be empty");
  
  await update(roomRef, { roomName: sanitized });
  
  // Update public room index if room is public
  if (roomData.visibility === "public" && !roomData.locked) {
    const players = (playersSnap.val() || {}) as Record<string, PlayerData>;
    const updatedRoomData = { ...roomData, roomName: sanitized };
    await updatePublicRoomIndex(roomCode, updatedRoomData as RoomData, players);
  }
}

// ============================================================================
// Public Room Index
// ============================================================================

/**
 * Update the public room index entry for a room.
 * Called when room state changes (player count, game status, etc.)
 * Only updates if room is public and not locked.
 */
export async function updatePublicRoomIndex(
  roomCode: string,
  roomData: RoomData,
  players: Record<string, PlayerData>
): Promise<void> {
  // Only index public, unlocked rooms
  // Default to public if visibility is not set (for backwards compatibility)
  const isPublic = roomData.visibility === "public" || roomData.visibility === undefined;
  if (!isPublic || roomData.locked) {
    return;
  }
  
  const db = getDb();
  const publicRoomRef = ref(db, `publicRooms/${roomCode}`);
  
  // Get owner name for display
  const owner = players[roomData.ownerId];
  const ownerName = owner?.name || "Unknown";
  
  // Count connected players
  const playerCount = Object.values(players).filter(p => p.connected).length;
  
  // Determine room status
  let status: "lobby" | "playing" | "paused" = "lobby";
  if (roomData.gameStarted && !roomData.gameOver) {
    status = roomData.paused ? "paused" : "playing";
  }
  
  // Room name with fallback
  const roomName = roomData.roomName || `${ownerName}'s Room`;
  
  await set(publicRoomRef, {
    roomName,
    ownerName,
    playerCount,
    status,
    timerPreset: roomData.timerPreset || DEFAULT_TIMER_PRESET,
    createdAt: roomData.createdAt || Date.now(),
  });
}

/**
 * Remove a room from the public index.
 * Called when room is deleted, locked, or made private.
 */
export async function removeFromPublicRoomIndex(roomCode: string): Promise<void> {
  const db = getDb();
  const publicRoomRef = ref(db, `publicRooms/${roomCode}`);
  await remove(publicRoomRef);
}

/**
 * Get list of public rooms for the home page.
 * Returns rooms sorted by player count (descending), limited to top N.
 * 
 * Also cleans up orphaned index entries - rooms where the actual room no longer exists.
 * This happens when onDisconnect deletes the room but the index wasn't cleaned up.
 */
export async function getPublicRooms(limit: number = 6): Promise<Array<{
  roomCode: string;
  roomName: string;
  ownerName: string;
  playerCount: number;
  status: "lobby" | "playing" | "paused";
  timerPreset: string;
  createdAt: number;
}>> {
  const db = getDb();
  const publicRoomsRef = ref(db, "publicRooms");
  const snapshot = await get(publicRoomsRef);
  
  if (!snapshot.exists()) return [];
  
  const rooms = snapshot.val() as Record<string, {
    roomName: string;
    ownerName: string;
    playerCount: number;
    status: "lobby" | "playing" | "paused";
    timerPreset: string;
    createdAt: number;
  }>;
  
  // Convert to array, filter by min players, sort by count
  const candidates = Object.entries(rooms)
    .map(([roomCode, data]) => ({ roomCode, ...data }))
    .filter(room => room.playerCount >= 4) // Only show rooms with 4+ players
    .sort((a, b) => b.playerCount - a.playerCount);
  
  // Check if each candidate room actually exists (verify not orphaned)
  // Check up to 50 entries to catch any orphaned entries (fallback safety net)
  // The onDisconnect handler removes both room and publicRooms, but this provides
  // additional cleanup in case of network issues or timing edge cases
  const toCheck = candidates.slice(0, Math.min(candidates.length, 50));
  const validRooms: typeof candidates = [];
  const orphanedCodes: string[] = [];
  
  await Promise.all(toCheck.map(async (room) => {
    const roomRef = ref(db, `rooms/${room.roomCode}`);
    const roomSnap = await get(roomRef);
    if (roomSnap.exists()) {
      validRooms.push(room);
    } else {
      orphanedCodes.push(room.roomCode);
    }
  }));
  
  // Clean up orphaned index entries in background (don't block response)
  if (orphanedCodes.length > 0) {
    Promise.all(orphanedCodes.map(code => 
      remove(ref(db, `publicRooms/${code}`))
    )).catch(err => {
      console.warn("[getPublicRooms] Failed to clean orphaned entries:", err.message);
    });
  }
  
  // Sort again (Promise.all doesn't preserve order) and limit
  return validRooms
    .sort((a, b) => b.playerCount - a.playerCount)
    .slice(0, limit);
}

export interface PublicRoomData {
  roomCode: string;
  roomName: string;
  ownerName: string;
  playerCount: number;
  status: "lobby" | "playing" | "paused";
  timerPreset: string;
  createdAt: number;
}

/**
 * Subscribe to real-time updates of public rooms.
 * Returns an unsubscribe function.
 * 
 * This provides instant updates when rooms change (player count, status, etc.)
 * instead of polling. The callback receives the filtered and sorted room list.
 */
export function subscribeToPublicRooms(
  limit: number = 6,
  onRoomsChange: (rooms: PublicRoomData[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDb();
  const publicRoomsRef = ref(db, "publicRooms");
  
  return onValue(
    publicRoomsRef,
    (snapshot) => {
      // Wrap async logic in an IIFE with error handling
      // (onValue doesn't await callbacks, so we handle errors ourselves)
      (async () => {
        if (!snapshot.exists()) {
          onRoomsChange([]);
          return;
        }
        
        const rooms = snapshot.val() as Record<string, {
          roomName: string;
          ownerName: string;
          playerCount: number;
          status: "lobby" | "playing" | "paused";
          timerPreset: string;
          createdAt: number;
        }>;
        
        // Convert to array, filter by min players, sort by count
        const candidates = Object.entries(rooms)
          .map(([roomCode, data]) => ({ roomCode, ...data }))
          .filter(room => room.playerCount >= 4) // Only show rooms with 4+ players
          .sort((a, b) => b.playerCount - a.playerCount);
        
        // Check if each candidate room actually exists (verify not orphaned)
        // Check up to 50 entries to catch any orphaned entries (fallback safety net)
        // The onDisconnect handler removes both room and publicRooms, but this provides
        // additional cleanup in case of network issues or timing edge cases
        const toCheck = candidates.slice(0, Math.min(candidates.length, 50));
        const validRooms: typeof candidates = [];
        const orphanedCodes: string[] = [];
        
        await Promise.all(toCheck.map(async (room) => {
          const roomRef = ref(db, `rooms/${room.roomCode}`);
          const roomSnap = await get(roomRef);
          if (roomSnap.exists()) {
            validRooms.push(room);
          } else {
            orphanedCodes.push(room.roomCode);
          }
        }));
        
        // Clean up orphaned index entries in background
        if (orphanedCodes.length > 0) {
          Promise.all(orphanedCodes.map(code => 
            remove(ref(db, `publicRooms/${code}`))
          )).catch(err => {
            console.warn("[subscribeToPublicRooms] Failed to clean orphaned entries:", err.message);
          });
        }
        
        // Sort again and limit
        const result = validRooms
          .sort((a, b) => b.playerCount - a.playerCount)
          .slice(0, limit);
        
        onRoomsChange(result);
      })().catch(err => {
        console.error("[subscribeToPublicRooms] Async error:", err);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      });
    },
    (error) => {
      console.error("[subscribeToPublicRooms] Subscription error:", error);
      onError?.(error);
    }
  );
}

/**
 * Kick a player from the room and temporarily ban them.
 * - Removes player from room entirely
 * - Adds to bannedPlayers with 2-minute expiry
 * - Clears their votes from the board
 * - Transfers ownership if they were the owner
 */
export async function kickPlayer(
  roomCode: string,
  requesterId: string,
  targetPlayerId: string
): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${targetPlayerId}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const [roomSnap, playersSnap] = await Promise.all([get(roomRef), get(playersRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== requesterId) throw new Error("Not room owner");
  if (requesterId === targetPlayerId) throw new Error("Cannot kick yourself");

  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;
  const targetPlayer = playersData[targetPlayerId];
  if (!targetPlayer) throw new Error("Player not found");

  // Calculate ban expiry (2 minutes from now)
  const banExpiry = Date.now() + BAN_DURATION_MS;

  // Clear votes from board
  const board = roomData.board || [];
  const voteRemovals = board.map((_, index) =>
    remove(ref(db, `rooms/${roomCode}/board/${index}/votes/${targetPlayerId}`))
  );
  await Promise.all(voteRemovals);

  // Remove player and add to ban list
  await Promise.all([
    remove(playerRef),
    update(roomRef, { [`bannedPlayers/${targetPlayerId}`]: banExpiry }),
  ]);

  // Add system message
  await push(ref(db, `rooms/${roomCode}/messages`), {
    playerId: null,
    playerName: "System",
    message: `${targetPlayer.name} was removed from the room.`,
    timestamp: serverTimestamp(),
    type: "system",
  });

  // Transfer ownership if the kicked player was somehow the owner
  // (shouldn't happen since owner can't kick themselves, but be safe)
  if (roomData.ownerId === targetPlayerId) {
    await reassignOwnerIfNeeded(roomCode, true, true);
  }

  // Update public room index (player count changed)
  const updatedPlayersSnap = await get(playersRef);
  const updatedPlayers = (updatedPlayersSnap.val() || {}) as Record<string, PlayerData>;
  const updatedRoomSnap = await get(roomRef);
  if (updatedRoomSnap.exists()) {
    updatePublicRoomIndex(roomCode, updatedRoomSnap.val() as RoomData, updatedPlayers).catch(() => {});
  }
}

export async function setLobbyRole(
  roomCode: string,
  playerId: string,
  team: "red" | "blue" | null,
  role: "clueGiver" | "guesser" | null,
  requesterId?: string // Owner can assign other players
): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const [roomSnap, playersSnap] = await Promise.all([get(roomRef), get(playersRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;
  const playerData = playersData[playerId];
  const isOwner = requesterId && roomData.ownerId === requesterId;
  const isSpectator = !playerData?.team || !playerData?.role;
  
  // Team management modes:
  // - Open Mode (Lobby, Paused, Game Over): Anyone can join/leave, owner can remove others
  // - Restricted Mode (Active Game): Only owner can add spectators as guessers
  const isActiveGame = roomData.gameStarted && !roomData.gameOver && !roomData.paused;
  
  if (isActiveGame) {
    if (!isOwner) throw new Error("Only owner can add players during game");
    if (!isSpectator) throw new Error("Can only add spectators during game");
    if (role === "clueGiver") throw new Error("Can only add as guesser during game");
  }

  // Check for duplicate clue giver
  if (role === "clueGiver" && team) {
    const existing = Object.entries(playersData).find(
      ([id, p]) => id !== playerId && p.team === team && p.role === "clueGiver"
    );
    if (existing) throw new Error("Team already has a clue giver");
  }

  await update(playerRef, { team: team || null, role: role || null });
}

export async function randomizeTeams(roomCode: string, playerId: string): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const [roomSnap, playersSnap] = await Promise.all([get(roomRef), get(playersRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  if (roomData.ownerId !== playerId) throw new Error("Not room owner");
  if (roomData.gameStarted && !roomData.gameOver) throw new Error("Game in progress");

  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;
  const players = Object.entries(playersData).map(([id, p]) => ({
    id,
    name: p.name,
    avatar: p.avatar || "🐱",
    team: p.team,
    role: p.role,
  }));

  if (players.length < MIN_PLAYERS_TO_START) throw new Error("Need at least 4 players");

  const shuffled = shufflePlayers(players);
  const half = Math.ceil(players.length / 2); // Red team gets extra player if odd

  const updates: Record<string, any> = {};
  shuffled.forEach((p, i) => {
    const isRedTeam = i < half;
    const isFirstOfTeam = i === 0 || i === half;
    updates[`players/${p.id}/team`] = isRedTeam ? "red" : "blue";
    updates[`players/${p.id}/role`] = isFirstOfTeam ? "clueGiver" : "guesser";
  });

  await update(roomRef, updates);
}

// ============================================================================
// Gameplay
// ============================================================================

export async function giveClue(roomCode: string, playerId: string, word: string, count: number): Promise<void> {
  const sanitized = sanitizeClue(word);
  if (!isValidClueFormat(sanitized) || count < 0) throw new Error("Invalid clue");

  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);

  const [roomSnap, playerSnap] = await Promise.all([get(roomRef), get(playerRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");
  if (!playerSnap.exists()) throw new Error("Player not found");

  const roomData = roomSnap.val() as RoomData;
  const playerData = playerSnap.val() as PlayerData;

  if (!roomData.gameStarted || roomData.gameOver || roomData.currentClue) throw new Error("Cannot give clue now");
  if (playerData.role !== "clueGiver" || playerData.team !== roomData.currentTeam) throw new Error("Not your turn");

  const board = roomData.board || [];
  if (!isValidClue(sanitized, board.map((c) => c.word))) throw new Error("Invalid clue word");

  // Clear votes and set clue
  const updatedBoard = board.map((c) => ({ ...c, votes: {} }));

  // Build update object - mark team's first clue if this is it
  const clueUpdate: Record<string, unknown> = {
    currentClue: { word: sanitized.toUpperCase(), count },
    remainingGuesses: count + 1,
    turnStartTime: serverTimestamp(),
    board: updatedBoard,
  };
  
  // Mark that this team has given their first clue (for first clue bonus tracking)
  if (roomData.currentTeam === "red" && !roomData.redHasGivenClue) {
    clueUpdate.redHasGivenClue = true;
  } else if (roomData.currentTeam === "blue" && !roomData.blueHasGivenClue) {
    clueUpdate.blueHasGivenClue = true;
  }

  await update(roomRef, clueUpdate);

  await push(ref(db, `rooms/${roomCode}/messages`), {
    playerId,
    playerName: playerData.name,
    playerAvatar: playerData.avatar || "🐱",
    message: `${sanitized} ${count}`,
    timestamp: serverTimestamp(),
    type: "clue",
    clueTeam: roomData.currentTeam as "red" | "blue",
  });
}

export async function voteCard(roomCode: string, playerId: string, cardIndex: number): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  const votesRef = ref(db, `rooms/${roomCode}/board/${cardIndex}/votes`);

  // First validate player and game state (these don't need to be in the transaction)
  const [roomSnap, playerSnap] = await Promise.all([get(roomRef), get(playerRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");
  if (!playerSnap.exists()) throw new Error("Player not found");

  const roomData = roomSnap.val() as RoomData;
  const playerData = playerSnap.val() as PlayerData;

  if (!roomData.gameStarted || roomData.gameOver || !roomData.currentClue || (roomData.remainingGuesses ?? 0) <= 0) {
    throw new Error("Cannot vote now");
  }
  if (playerData.role !== "guesser" || playerData.team !== roomData.currentTeam) throw new Error("Not your turn");

  const board = roomData.board || [];
  if (cardIndex < 0 || cardIndex >= board.length || board[cardIndex].revealed) {
    throw new Error("Invalid card");
  }

  // Use transaction to atomically toggle the vote
  // This prevents race conditions when multiple players vote simultaneously
  await runTransaction(votesRef, (currentVotes) => {
    const votes = currentVotes || {};
    
    // Toggle vote
    if (votes[playerId]) {
      delete votes[playerId];
    } else {
      votes[playerId] = true;
    }
    
    return votes;
  });
}

export async function confirmReveal(roomCode: string, playerId: string, cardIndex: number): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const cardRevealedRef = ref(db, `rooms/${roomCode}/board/${cardIndex}/revealed`);

  const [roomSnap, playerSnap, playersSnap] = await Promise.all([
    get(roomRef),
    get(playerRef),
    get(playersRef),
  ]);

  if (!roomSnap.exists()) throw new Error("Room not found");
  if (!playerSnap.exists()) throw new Error("Player not found");

  const roomData = roomSnap.val() as RoomData;
  const playerData = playerSnap.val() as PlayerData;
  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;

  if (!roomData.gameStarted || roomData.gameOver || !roomData.currentClue || (roomData.remainingGuesses ?? 0) <= 0) {
    throw new Error("Cannot reveal now");
  }
  if (playerData.role !== "guesser" || playerData.team !== roomData.currentTeam) throw new Error("Not your turn");

  const board = roomData.board || [];
  if (cardIndex < 0 || cardIndex >= board.length || board[cardIndex].revealed) {
    throw new Error("Invalid card");
  }

  const card = board[cardIndex];
  // Count all guessers on the team (not just connected) so threshold stays
  // consistent even if someone's connection temporarily drops
  const guessers = Object.values(playersData).filter(
    (p) => p.team === roomData.currentTeam && p.role === "guesser"
  );
  const required = getRequiredVotes(guessers.length);
  const voteCount = Object.keys(card.votes || {}).length;

  if (voteCount < required || !card.votes?.[playerId]) {
    throw new Error("Not enough votes");
  }

  // Use transaction to atomically claim the reveal (prevents race condition)
  // If two players try to reveal simultaneously, only one will succeed
  const transactionResult = await runTransaction(cardRevealedRef, (currentRevealed) => {
    if (currentRevealed === true) {
      // Card already revealed by another player - abort transaction
      return undefined;
    }
    return true;
  });

  if (!transactionResult.committed) {
    throw new Error("Card already revealed");
  }

  const isCorrect = card.team === roomData.currentTeam;
  const isTrap = card.team === "trap";
  // Count remaining team cards (excluding the one we're about to reveal)
  const remainingTeamCards = board.filter(
    (c, i) => c.team === roomData.currentTeam && !c.revealed && i !== cardIndex
  ).length;
  const newGuesses = (roomData.remainingGuesses ?? 1) - 1;

  // Build reveal message
  const revealMessage = card.word;

  // Update remaining card fields and game state
  // Note: revealed is already set to true by the transaction above
  const cardUpdate = {
    [`board/${cardIndex}/revealedBy`]: playerId,
    [`board/${cardIndex}/votes`]: {},
  };

  if (isTrap) {
    await update(roomRef, {
      ...cardUpdate,
      gameOver: true,
      winner: roomData.currentTeam === "red" ? "blue" : "red",
      currentClue: null,
      remainingGuesses: null,
      turnStartTime: null,
    });
  } else if (!isCorrect || newGuesses === 0) {
    const newTeam = roomData.currentTeam === "red" ? "blue" : "red";
    const pause = checkPause(playersData, newTeam, false);
    // Clear votes from all unrevealed cards when turn ends
    const boardVotesCleared: Record<string, null> = {};
    board.forEach((c, i) => {
      if (!c.revealed && i !== cardIndex) {
        boardVotesCleared[`board/${i}/votes`] = null;
      }
    });
    await update(roomRef, {
      ...cardUpdate,
      ...boardVotesCleared,
      currentTeam: newTeam,
      currentClue: null,
      remainingGuesses: null,
      turnStartTime: pause.paused ? null : serverTimestamp(),
      paused: pause.paused,
      pauseReason: pause.reason,
      pausedForTeam: pause.team,
    });
  } else if (remainingTeamCards === 0) {
    await update(roomRef, {
      ...cardUpdate,
      gameOver: true,
      winner: roomData.currentTeam,
      currentClue: null,
      remainingGuesses: null,
      turnStartTime: null,
    });
  } else {
    await update(roomRef, {
      ...cardUpdate,
      remainingGuesses: newGuesses,
    });
  }

  // Add reveal message (after board update)
  await push(ref(db, `rooms/${roomCode}/messages`), {
    playerId,
    playerName: playerData.name,
    playerAvatar: playerData.avatar || "🐱",
    message: revealMessage,
    timestamp: serverTimestamp(),
    type: "reveal",
    revealedTeam: card.team,
  });
}

export async function endTurn(roomCode: string): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const [roomSnap, playersSnap] = await Promise.all([get(roomRef), get(playersRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  if (!roomData.gameStarted || roomData.gameOver) throw new Error("Game not active");

  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;
  const newTeam = roomData.currentTeam === "red" ? "blue" : "red";
  const pause = checkPause(playersData, newTeam, false);
  
  // Clear votes from all unrevealed cards using explicit paths
  const board = roomData.board || [];
  const votesCleared: Record<string, null> = {};
  board.forEach((c, i) => {
    if (!c.revealed) {
      votesCleared[`board/${i}/votes`] = null;
    }
  });

  await update(roomRef, {
    ...votesCleared,
    currentTeam: newTeam,
    currentClue: null,
    remainingGuesses: null,
    turnStartTime: pause.paused ? null : serverTimestamp(),
    paused: pause.paused,
    pauseReason: pause.reason,
    pausedForTeam: pause.team,
  });
}

// ============================================================================
// Chat
// ============================================================================

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
  type: "clue" | "chat"
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
  
  // Prune old messages in background (don't block the send)
  // Only check occasionally to avoid extra reads on every message
  if (Math.random() < 0.1) { // ~10% of messages trigger a prune check
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

// ============================================================================
// Presence - not needed with onDisconnect, but keeping for manual cleanup
// ============================================================================

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
  const now = Date.now();

  // Find stale players who are disconnected beyond grace period AND have a team/role
  const stalePlayers: { id: string; name: string }[] = [];

  Object.entries(players).forEach(([id, p]) => {
    if (p.connected === true) return;
    if (!p.lastSeen || now - p.lastSeen >= graceMs) {
      // Only count as stale if they have a team or role to clear
      if (p.team !== null || p.role !== null) {
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
    if (player.team !== null) updates[`players/${id}/team`] = null;
    if (player.role !== null) updates[`players/${id}/role`] = null;
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

  // Add system message for each demoted player (batch them to avoid spam)
  if (stalePlayers.length > 0) {
    const names = stalePlayers.map((p) => p.name).join(", ");
    const message = stalePlayers.length === 1
      ? `${names} moved to spectators (disconnected)`
      : `${names} moved to spectators (disconnected)`;
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

export async function deleteRoom(roomCode: string): Promise<void> {
  const db = getDb();
  await remove(ref(db, `rooms/${roomCode}`));
}
