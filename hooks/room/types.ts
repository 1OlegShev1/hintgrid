/**
 * Shared types for room hooks
 */

import type {
  GameState,
  Player,
  ChatMessage,
  RoomClosedReason,
  Card,
  WordPack,
  WordPackSelection,
  TimerPreset,
  FirebaseBoardCard,
  FirebasePlayerData,
  FirebaseMessageData,
  FirebaseRoomData,
} from "@/shared/types";
import { DEFAULT_TIMER_PRESET, TIMER_PRESETS } from "@/shared/constants";

// Re-export Firebase types for convenience
export type { FirebaseBoardCard, FirebasePlayerData, FirebaseMessageData, FirebaseRoomData };

// Alias for shorter names in this module
export type BoardCard = FirebaseBoardCard;
export type PlayerData = FirebasePlayerData;
export type MessageData = FirebaseMessageData;
export type RoomData = FirebaseRoomData;

// Transform functions

/**
 * Transform Firebase room data into client GameState.
 * Handles the conversion from Firebase's Record-based votes to array-based cardVotes.
 */
export function toGameState(
  roomCode: string,
  roomData: FirebaseRoomData | null,
  players: Player[]
): GameState | null {
  if (!roomData) return null;
  const boardData: FirebaseBoardCard[] = roomData.board || [];

  // Convert votes from Record<string, boolean> to string[] per card
  const cardVotes: Record<number, string[]> = {};
  boardData.forEach((c, i) => {
    const votes = c.votes ? Object.keys(c.votes).filter((id) => c.votes[id]) : [];
    if (votes.length) cardVotes[i] = votes;
  });

  // Handle backwards compatibility: old rooms may have turnDuration but not timerPreset
  // Map old turnDuration to closest preset, or use default
  let timerPreset: TimerPreset = roomData.timerPreset || DEFAULT_TIMER_PRESET;
  if (!roomData.timerPreset && roomData.turnDuration) {
    // Legacy room - map old turnDuration to closest preset
    if (roomData.turnDuration <= 45) {
      timerPreset = "fast";
    } else if (roomData.turnDuration <= 75) {
      timerPreset = "normal";
    } else {
      timerPreset = "relaxed";
    }
  }
  
  // For legacy turnDuration field, derive from preset if not set
  const preset = TIMER_PRESETS[timerPreset];
  const turnDuration = roomData.turnDuration || preset.clue;

  return {
    roomCode,
    players,
    board: boardData.map((c) => ({
      word: c.word,
      team: c.team as Card["team"],
      revealed: c.revealed || false,
      revealedBy: c.revealedBy || undefined,
    })),
    ownerId: roomData.ownerId || null,
    cardVotes,
    currentTeam: roomData.currentTeam || "red",
    startingTeam: roomData.startingTeam || "red",
    // Handle both legacy single pack and new array format
    wordPack: roomData.wordPack 
      ? (Array.isArray(roomData.wordPack) ? roomData.wordPack : [roomData.wordPack])
      : ["classic"],
    currentClue: roomData.currentClue || null,
    remainingGuesses: roomData.remainingGuesses ?? null,
    turnStartTime: roomData.turnStartTime || null,
    timerPreset,
    redHasGivenClue: roomData.redHasGivenClue || false,
    blueHasGivenClue: roomData.blueHasGivenClue || false,
    turnDuration, // Legacy field - kept for compatibility
    gameStarted: roomData.gameStarted || false,
    gameOver: roomData.gameOver || false,
    winner: roomData.winner || null,
    paused: roomData.paused || false,
    pauseReason: roomData.pauseReason || null,
    pausedForTeam: roomData.pausedForTeam || null,
    locked: roomData.locked || false,
  };
}

/**
 * Transform Firebase players data into client Player array.
 */
export function toPlayers(playersData: Record<string, FirebasePlayerData> | null): Player[] {
  if (!playersData) return [];
  return Object.entries(playersData).map(([id, p]) => ({
    id,
    name: p.name,
    avatar: p.avatar || "🐱",
    team: p.team || null,
    role: p.role || null,
    connected: p.connected,
    lastSeen: p.lastSeen ?? null,
  }));
}

/**
 * Transform Firebase reactions data into client format.
 * Firebase: Record<emoji, Record<playerId, boolean>>
 * Client: Record<emoji, playerId[]>
 */
function transformReactions(
  reactions: Record<string, Record<string, boolean>> | undefined
): Record<string, string[]> | undefined {
  if (!reactions) return undefined;
  const result: Record<string, string[]> = {};
  for (const [emoji, players] of Object.entries(reactions)) {
    const playerIds = Object.keys(players).filter((id) => players[id]);
    if (playerIds.length > 0) {
      result[emoji] = playerIds;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Transform Firebase messages data into client ChatMessage array.
 */
export function toMessages(messagesData: Record<string, FirebaseMessageData> | null): ChatMessage[] {
  if (!messagesData) return [];
  return Object.entries(messagesData)
    .map(([id, m]) => ({
      id,
      playerId: m.playerId || undefined,
      playerName: m.playerName,
      playerAvatar: m.playerAvatar,
      message: m.message,
      timestamp: m.timestamp || Date.now(),
      type: m.type,
      clueTeam: m.clueTeam,
      revealedTeam: m.revealedTeam,
      reactions: transformReactions(m.reactions),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Re-export client types for convenience
export type { GameState, Player, ChatMessage, RoomClosedReason, WordPack, WordPackSelection, TimerPreset };
