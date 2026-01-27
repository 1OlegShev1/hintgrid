/**
 * Shared types for room hooks
 */

import type { GameState, Player, ChatMessage, RoomClosedReason, Card, WordPack } from "@/shared/types";

export interface BoardCard {
  word: string;
  team: string;
  revealed: boolean;
  revealedBy: string | null;
  votes: Record<string, boolean>;
}

export interface PlayerData {
  name: string;
  avatar: string;
  team: string | null;
  role: string | null;
  connected: boolean;
  lastSeen: number;
}

export interface MessageData {
  playerId: string | null;
  playerName: string;
  message: string;
  timestamp: number;
  type: string;
}

// Transform functions
export function toGameState(roomCode: string, roomData: any, players: Player[]): GameState | null {
  if (!roomData) return null;
  const boardData: BoardCard[] = roomData.board || [];

  const cardVotes: Record<number, string[]> = {};
  boardData.forEach((c, i) => {
    const votes = c.votes ? Object.keys(c.votes).filter((id) => c.votes[id]) : [];
    if (votes.length) cardVotes[i] = votes;
  });

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
    wordPack: roomData.wordPack || "classic",
    currentClue: roomData.currentClue || null,
    remainingGuesses: roomData.remainingGuesses ?? null,
    turnStartTime: roomData.turnStartTime || null,
    turnDuration: roomData.turnDuration || 60,
    gameStarted: roomData.gameStarted || false,
    gameOver: roomData.gameOver || false,
    winner: roomData.winner || null,
    paused: roomData.paused || false,
    pauseReason: roomData.pauseReason || null,
    pausedForTeam: roomData.pausedForTeam || null,
  };
}

export function toPlayers(playersData: Record<string, PlayerData> | null): Player[] {
  if (!playersData) return [];
  return Object.entries(playersData).map(([id, p]) => ({
    id,
    name: p.name,
    avatar: p.avatar || "🐱",
    team: (p.team as Player["team"]) || null,
    role: (p.role as Player["role"]) || null,
  }));
}

export function toMessages(messagesData: Record<string, MessageData> | null): ChatMessage[] {
  if (!messagesData) return [];
  return Object.entries(messagesData)
    .map(([id, m]) => ({
      id,
      playerId: m.playerId || undefined,
      playerName: m.playerName,
      message: m.message,
      timestamp: m.timestamp || Date.now(),
      type: m.type as ChatMessage["type"],
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Re-export types for convenience
export type { GameState, Player, ChatMessage, RoomClosedReason, WordPack };
