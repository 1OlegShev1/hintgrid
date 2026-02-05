/**
 * Game lifecycle: start, rematch, end, pause, resume.
 * Contains the shared _initializeGame helper to avoid duplication.
 */

import {
  ref, get, update, push,
  serverTimestamp,
} from "firebase/database";
import { getDb, clearGameMessages, type RoomData, type PlayerData, type MessageData, type BoardCard } from "./helpers";
import { updatePublicRoomIndex } from "./public-rooms";
import { generateBoard, assignTeams } from "@/shared/words";
import { teamsAreReady } from "@/shared/game-utils";
import type { Player, Team } from "@/shared/types";
import { DEFAULT_WORD_PACK } from "@/shared/constants";

/**
 * Shared initialization logic for startGame and rematch.
 * Validates room state, generates board, clears game messages, and updates room.
 */
async function _initializeGame(
  roomCode: string,
  playerId: string,
  opts: { requireGameOver: boolean }
): Promise<void> {
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

  if (opts.requireGameOver) {
    if (!roomData.gameOver) throw new Error("Game not over");
  } else {
    if (roomData.gameStarted) throw new Error("Game already started");
  }

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

  // For rematch, randomize starting team; for start, use existing
  const startingTeam: Team = opts.requireGameOver
    ? (Math.random() < 0.5 ? "red" : "blue")
    : (roomData.startingTeam as "red" | "blue");

  const board: BoardCard[] = assignTeams(boardWords, startingTeam).map((c) => ({
    word: c.word,
    team: c.team,
    revealed: false,
    revealedBy: null,
    votes: {},
  }));

  // Clear game-related messages (keep chat and user system messages)
  const messagesData = (messagesSnap.val() || {}) as Record<string, MessageData>;
  await clearGameMessages(roomCode, messagesData);

  // Build room update - rematch also updates startingTeam
  const roomUpdate: Record<string, unknown> = {
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
  };

  if (opts.requireGameOver) {
    roomUpdate.startingTeam = startingTeam;
  }

  await update(roomRef, roomUpdate);

  // Update public room index (status changed to "playing")
  const updatedRoomData = { ...roomData, gameStarted: true, gameOver: false, paused: false };
  updatePublicRoomIndex(roomCode, updatedRoomData as RoomData, playersData).catch(() => {});
}

export async function startGame(roomCode: string, playerId: string): Promise<void> {
  await _initializeGame(roomCode, playerId, { requireGameOver: false });
}

export async function rematch(roomCode: string, playerId: string): Promise<void> {
  await _initializeGame(roomCode, playerId, { requireGameOver: true });
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
