/**
 * Lobby actions: team assignment, settings, kick/ban, randomize teams.
 */

import {
  ref, get, update, remove, push,
  serverTimestamp,
} from "firebase/database";
import { getDb, getServerTime, type RoomData, type PlayerData } from "./helpers";
import { updatePublicRoomIndex, removeFromPublicRoomIndex } from "./public-rooms";
import { reassignOwnerIfNeeded } from "./room-management";
import { shufflePlayers } from "@/shared/game-utils";
import type { WordPack } from "@/shared/types";
import {
  TIMER_PRESET_KEYS,
  WORD_PACKS,
  MIN_PLAYERS_TO_START,
  BAN_DURATION_MS,
  type TimerPreset,
} from "@/shared/constants";

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

  // Calculate ban expiry using server-adjusted time (resistant to client clock skew)
  const serverNow = await getServerTime();
  const banExpiry = serverNow + BAN_DURATION_MS;

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
    updatePublicRoomIndex(roomCode, updatedRoomSnap.val() as RoomData, updatedPlayers).catch((e) => console.warn("[PublicRoomIndex] Update failed:", e));
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
