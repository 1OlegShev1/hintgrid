/**
 * Game actions hook - handles all game-related actions.
 * Uses ErrorContext for user-facing error notifications.
 */

import { useCallback } from "react";
import * as actions from "@/lib/rtdb-actions";
import { useError } from "@/contexts/ErrorContext";
import type { WordPack, TimerPreset } from "./types";

export interface UseGameActionsReturn {
  handleStartGame: () => void;
  handleSetLobbyRole: (team: "red" | "blue" | null, role: "clueGiver" | "guesser" | null, targetPlayerId?: string) => void;
  handleRandomizeTeams: () => void;
  handleRematch: () => void;
  handleEndGame: () => void;
  handlePauseGame: () => void;
  handleResumeGame: () => void;
  handleVoteCard: (index: number) => void;
  handleConfirmReveal: (index: number) => void;
  handleEndTurn: () => void;
  handleGiveClue: (word: string, count: number) => void;
  handleTimerPresetChange: (preset: TimerPreset) => void;
  handleWordPackChange: (packs: WordPack[]) => void;
  handleSetRoomLocked: (locked: boolean) => void;
  handleKickPlayer: (targetPlayerId: string) => void;
  handleSetRoomName: (roomName: string) => void;
}

export function useGameActions(
  roomCode: string,
  uid: string | null
): UseGameActionsReturn {
  const { showError } = useError();

  const handleStartGame = useCallback(() => {
    if (uid) actions.startGame(roomCode, uid).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleSetLobbyRole = useCallback((
    t: "red" | "blue" | null,
    r: "clueGiver" | "guesser" | null,
    targetPlayerId?: string
  ) => {
    if (uid) {
      const target = targetPlayerId || uid;
      actions.setLobbyRole(roomCode, target, t, r, uid).catch((e) => showError(e.message));
    }
  }, [roomCode, uid, showError]);

  const handleRandomizeTeams = useCallback(() => {
    if (uid) actions.randomizeTeams(roomCode, uid).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleRematch = useCallback(() => {
    if (uid) actions.rematch(roomCode, uid).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleEndGame = useCallback(() => {
    if (uid) actions.endGame(roomCode, uid).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handlePauseGame = useCallback(() => {
    if (uid) actions.pauseGame(roomCode, uid).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleResumeGame = useCallback(() => {
    if (uid) actions.resumeGame(roomCode, uid).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleVoteCard = useCallback((i: number) => {
    if (uid) actions.voteCard(roomCode, uid, i).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleConfirmReveal = useCallback((i: number) => {
    if (uid) actions.confirmReveal(roomCode, uid, i).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleEndTurn = useCallback(() => {
    actions.endTurn(roomCode).catch((e) => showError(e.message));
  }, [roomCode, showError]);

  const handleGiveClue = useCallback((w: string, c: number) => {
    if (uid) actions.giveClue(roomCode, uid, w, c).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleTimerPresetChange = useCallback((preset: TimerPreset) => {
    if (uid) actions.setTimerPreset(roomCode, uid, preset).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleWordPackChange = useCallback((packs: WordPack[]) => {
    if (uid) actions.setWordPack(roomCode, uid, packs).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleSetRoomLocked = useCallback((locked: boolean) => {
    if (uid) actions.setRoomLocked(roomCode, uid, locked).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleKickPlayer = useCallback((targetPlayerId: string) => {
    if (uid) actions.kickPlayer(roomCode, uid, targetPlayerId).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  const handleSetRoomName = useCallback((roomName: string) => {
    if (uid) actions.setRoomName(roomCode, uid, roomName).catch((e) => showError(e.message));
  }, [roomCode, uid, showError]);

  return {
    handleStartGame,
    handleSetLobbyRole,
    handleRandomizeTeams,
    handleRematch,
    handleEndGame,
    handlePauseGame,
    handleResumeGame,
    handleVoteCard,
    handleConfirmReveal,
    handleEndTurn,
    handleGiveClue,
    handleTimerPresetChange,
    handleWordPackChange,
    handleSetRoomLocked,
    handleKickPlayer,
    handleSetRoomName,
  };
}
