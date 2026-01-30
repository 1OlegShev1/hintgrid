/**
 * Realtime Database room hook - composes smaller hooks for room management.
 * This is the main entry point that provides a unified API.
 */

import { useEffect, useRef, useCallback } from "react";
import { useGameContext } from "@/components/GameContext";
import { useRoomConnection } from "./room/useRoomConnection";
import { useGameActions } from "./room/useGameActions";
import { useChatActions } from "./room/useChatActions";
import * as actions from "@/lib/rtdb-actions";
import { STALE_PLAYER_CHECK_INTERVAL_MS, STALE_PLAYER_GRACE_MS } from "@/shared/constants";
import type { GameState, Player, ChatMessage, RoomClosedReason, WordPack, TimerPreset } from "@/shared/types";

export interface UseRtdbRoomReturn {
  gameState: GameState | null;
  players: Player[];
  currentPlayer: Player | null;
  messages: ChatMessage[];
  isConnecting: boolean;
  connectionError: string | null;
  connectedPlayerCount: number;
  roomClosedReason: RoomClosedReason | null;
  chatInput: string;
  setChatInput: (value: string) => void;
  isSendingChat: boolean;
  chatInputRef: React.RefObject<HTMLInputElement | null>;
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
  handleSendMessage: (e: React.FormEvent) => void;
  handleEmojiSelect: (emoji: string) => void;
  handleAddReaction: (messageId: string, emoji: string) => void;
  handleRemoveReaction: (messageId: string, emoji: string) => void;
  handleGiveClue: (word: string, count: number) => void;
  handleTimerPresetChange: (preset: TimerPreset) => void;
  handleWordPackChange: (packs: WordPack[]) => void;
  handleSetRoomLocked: (locked: boolean) => void;
  handleKickPlayer: (targetPlayerId: string) => void;
  handleSetRoomName: (roomName: string) => void;
}

export function useRtdbRoom(
  roomCode: string,
  playerName: string,
  playerAvatar: string,
  visibility?: "public" | "private"
): UseRtdbRoomReturn {
  const { setIsLastPlayer, setIsActiveGame, setLeaveRoom } = useGameContext();

  // Room connection and state
  const connection = useRoomConnection(roomCode, playerName, playerAvatar, visibility);

  // Game actions (uses ErrorContext internally)
  const gameActions = useGameActions(roomCode, connection.uid);

  // Chat actions
  const chatActions = useChatActions(roomCode, connection.uid);

  // Update GameContext with room state
  const isLast = connection.connectedPlayerCount === 1 && 
    !!connection.gameState?.gameStarted && 
    !connection.gameState?.gameOver;
  const isActive = !!connection.gameState?.gameStarted && !connection.gameState?.gameOver;

  useEffect(() => {
    setIsLastPlayer(isLast);
    setIsActiveGame(isActive);
    return () => {
      setIsLastPlayer(false);
      setIsActiveGame(false);
    };
  }, [isLast, isActive, setIsLastPlayer, setIsActiveGame]);

  // Use refs for leaveRoom to avoid stale closures and empty callbacks during re-renders
  const uidRef = useRef<string | null>(connection.uid);
  const roomCodeRef = useRef(roomCode);
  
  // Keep refs updated with latest values
  useEffect(() => {
    uidRef.current = connection.uid;
    roomCodeRef.current = roomCode;
  }, [connection.uid, roomCode]);
  
  // Stable leaveRoom callback that uses refs - never becomes empty
  const leaveRoomCallback = useCallback(async () => {
    const uid = uidRef.current;
    const code = roomCodeRef.current;
    if (uid && code) {
      await actions.leaveRoom(code, uid);
    }
  }, []);
  
  // Set up leaveRoom callback once on mount
  useEffect(() => {
    setLeaveRoom(leaveRoomCallback);
    // Don't clear on cleanup - the callback should always work via refs
  }, [setLeaveRoom, leaveRoomCallback]);

  // Owner-only cleanup: demote stale disconnected players to spectators
  // Runs in all phases (lobby, active game, paused, game over) to keep player list clean
  useEffect(() => {
    if (!connection.uid || !roomCode || !connection.gameState) return;
    if (connection.gameState.ownerId !== connection.uid) return;

    let intervalId: NodeJS.Timeout | null = null;

    const runCleanup = () => {
      actions
        .pruneStalePlayers(roomCode, connection.uid!, STALE_PLAYER_GRACE_MS)
        .catch((err) => {
          console.warn("[Room] Failed to prune stale players:", err.message);
        });
    };

    runCleanup();
    intervalId = setInterval(runCleanup, STALE_PLAYER_CHECK_INTERVAL_MS);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [connection.uid, roomCode, connection.gameState?.ownerId]);

  return {
    // Connection state
    gameState: connection.gameState,
    players: connection.players,
    currentPlayer: connection.currentPlayer,
    messages: connection.messages,
    isConnecting: connection.isConnecting,
    connectionError: connection.connectionError,
    connectedPlayerCount: connection.connectedPlayerCount,
    roomClosedReason: connection.roomClosedReason,
    
    // Chat
    chatInput: chatActions.chatInput,
    setChatInput: chatActions.setChatInput,
    isSendingChat: chatActions.isSending,
    chatInputRef: chatActions.inputRef,
    handleSendMessage: chatActions.handleSendMessage,
    handleEmojiSelect: chatActions.handleEmojiSelect,
    handleAddReaction: chatActions.handleAddReaction,
    handleRemoveReaction: chatActions.handleRemoveReaction,
    
    // Game actions
    handleStartGame: gameActions.handleStartGame,
    handleSetLobbyRole: gameActions.handleSetLobbyRole,
    handleRandomizeTeams: gameActions.handleRandomizeTeams,
    handleRematch: gameActions.handleRematch,
    handleEndGame: gameActions.handleEndGame,
    handlePauseGame: gameActions.handlePauseGame,
    handleResumeGame: gameActions.handleResumeGame,
    handleVoteCard: gameActions.handleVoteCard,
    handleConfirmReveal: gameActions.handleConfirmReveal,
    handleEndTurn: gameActions.handleEndTurn,
    handleGiveClue: gameActions.handleGiveClue,
    handleTimerPresetChange: gameActions.handleTimerPresetChange,
    handleWordPackChange: gameActions.handleWordPackChange,
    handleSetRoomLocked: gameActions.handleSetRoomLocked,
    handleKickPlayer: gameActions.handleKickPlayer,
    handleSetRoomName: gameActions.handleSetRoomName,
  };
}
