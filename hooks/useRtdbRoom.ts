/**
 * Realtime Database room hook - composes smaller hooks for room management.
 * This is the main entry point that provides a unified API.
 */

import { useEffect, useRef, useCallback } from "react";
import { useGameContext } from "@/components/GameContext";
import { useRoomConnection } from "./room/useRoomConnection";
import { useGameActions } from "./room/useGameActions";
import { useChatActions } from "./room/useChatActions";
import * as actions from "@/lib/rtdb";
import { STALE_PLAYER_CHECK_INTERVAL_MS, STALE_PLAYER_GRACE_MS } from "@/shared/constants";
import { trackRoomJoined, trackGameCompleted } from "@/lib/analytics";
import { setRoomContext, addBreadcrumb } from "@/lib/sentry";
import type { GameState, Player, ChatMessage, RoomClosedReason, WordPack, TimerPreset } from "@/shared/types";

export interface RoomState {
  gameState: GameState | null;
  players: Player[];
  currentPlayer: Player | null;
  messages: ChatMessage[];
  connectedPlayerCount: number;
  roomClosedReason: RoomClosedReason | null;
}

export interface RoomConnection {
  isConnecting: boolean;
  error: string | null;
}

export interface RoomChat {
  input: string;
  setInput: (value: string) => void;
  isSending: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  send: (e: React.FormEvent) => void;
  onEmojiSelect: (emoji: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
}

export interface RoomActions {
  startGame: () => void;
  setLobbyRole: (team: "red" | "blue" | null, role: "clueGiver" | "guesser" | null, targetPlayerId?: string) => void;
  randomizeTeams: () => void;
  rematch: () => void;
  endGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  voteCard: (index: number) => void;
  confirmReveal: (index: number) => void;
  endTurn: () => void;
  giveClue: (word: string, count: number) => void;
  timerPresetChange: (preset: TimerPreset) => void;
  wordPackChange: (packs: WordPack[]) => void;
  customWordsChange: (words: string[]) => void;
  setRoomLocked: (locked: boolean) => void;
  kickPlayer: (targetPlayerId: string) => void;
  setRoomName: (roomName: string) => void;
}

export interface UseRtdbRoomReturn {
  state: RoomState;
  connection: RoomConnection;
  chat: RoomChat;
  actions: RoomActions;
}

export function useRtdbRoom(
  roomCode: string,
  playerName: string,
  playerAvatar: string,
  visibility?: "public" | "private"
): UseRtdbRoomReturn {
  const { setIsLastPlayer, setIsActiveGame, setLeaveRoom } = useGameContext();

  // Room connection and state
  const conn = useRoomConnection(roomCode, playerName, playerAvatar, visibility);

  // Game actions (uses ErrorContext internally)
  const gameActions = useGameActions(roomCode, conn.uid);

  // Chat actions (pass message count for deterministic pruning)
  const chatActions = useChatActions(roomCode, conn.uid, conn.messages.length);

  // Update GameContext with room state
  const isLast = conn.connectedPlayerCount === 1 && 
    !!conn.gameState?.gameStarted && 
    !conn.gameState?.gameOver;
  const isActive = !!conn.gameState?.gameStarted && !conn.gameState?.gameOver;

  useEffect(() => {
    setIsLastPlayer(isLast);
    setIsActiveGame(isActive);
    return () => {
      setIsLastPlayer(false);
      setIsActiveGame(false);
    };
  }, [isLast, isActive, setIsLastPlayer, setIsActiveGame]);

  // Track room join and set Sentry room context
  useEffect(() => {
    if (!conn.isConnecting && !conn.connectionError && conn.gameState) {
      trackRoomJoined(roomCode);
      setRoomContext(roomCode);
      addBreadcrumb(`Joined room ${roomCode}`, "navigation");
    }
    return () => { setRoomContext(null); };
  // Only run once when connection completes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn.isConnecting]);

  // Track game completion (win or trap — not abandoned, that's tracked in useGameActions)
  const prevGameOverRef = useRef(false);
  useEffect(() => {
    const gs = conn.gameState;
    if (!gs) return;
    const wasOver = prevGameOverRef.current;
    prevGameOverRef.current = gs.gameOver;

    if (gs.gameOver && !wasOver && gs.winner) {
      // Detect trap vs normal win by checking if trap card was revealed
      const trapRevealed = gs.board?.some((c) => c.team === "trap" && c.revealed);
      trackGameCompleted(
        roomCode,
        trapRevealed ? "trap" : "win",
        gs.winner,
        undefined
      );
    }
  }, [conn.gameState, roomCode]);

  // Use refs for leaveRoom to avoid stale closures and empty callbacks during re-renders
  const uidRef = useRef<string | null>(conn.uid);
  const roomCodeRef = useRef(roomCode);
  
  // Keep refs updated with latest values
  useEffect(() => {
    uidRef.current = conn.uid;
    roomCodeRef.current = roomCode;
  }, [conn.uid, roomCode]);
  
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
  // Extract ownerId as a separate variable to avoid effect re-running on every gameState change
  const ownerId = conn.gameState?.ownerId;
  
  useEffect(() => {
    if (!conn.uid || !roomCode || !ownerId) return;
    if (ownerId !== conn.uid) return;

    let intervalId: NodeJS.Timeout | null = null;
    let isRunning = false; // Guard against concurrent calls (StrictMode, rapid re-renders)

    const runCleanup = async () => {
      if (isRunning) return;
      isRunning = true;
      try {
        await actions.pruneStalePlayers(roomCode, conn.uid!, STALE_PLAYER_GRACE_MS);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[Room] Failed to prune stale players:", message);
      } finally {
        isRunning = false;
      }
    };

    runCleanup();
    intervalId = setInterval(runCleanup, STALE_PLAYER_CHECK_INTERVAL_MS);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [conn.uid, roomCode, ownerId]);

  return {
    state: {
      gameState: conn.gameState,
      players: conn.players,
      currentPlayer: conn.currentPlayer,
      messages: conn.messages,
      connectedPlayerCount: conn.connectedPlayerCount,
      roomClosedReason: conn.roomClosedReason,
    },
    connection: {
      isConnecting: conn.isConnecting,
      error: conn.connectionError,
    },
    chat: {
      input: chatActions.chatInput,
      setInput: chatActions.setChatInput,
      isSending: chatActions.isSending,
      inputRef: chatActions.inputRef,
      send: chatActions.handleSendMessage,
      onEmojiSelect: chatActions.handleEmojiSelect,
      addReaction: chatActions.handleAddReaction,
      removeReaction: chatActions.handleRemoveReaction,
    },
    actions: {
      startGame: gameActions.handleStartGame,
      setLobbyRole: gameActions.handleSetLobbyRole,
      randomizeTeams: gameActions.handleRandomizeTeams,
      rematch: gameActions.handleRematch,
      endGame: gameActions.handleEndGame,
      pauseGame: gameActions.handlePauseGame,
      resumeGame: gameActions.handleResumeGame,
      voteCard: gameActions.handleVoteCard,
      confirmReveal: gameActions.handleConfirmReveal,
      endTurn: gameActions.handleEndTurn,
      giveClue: gameActions.handleGiveClue,
      timerPresetChange: gameActions.handleTimerPresetChange,
      wordPackChange: gameActions.handleWordPackChange,
      customWordsChange: gameActions.handleCustomWordsChange,
      setRoomLocked: gameActions.handleSetRoomLocked,
      kickPlayer: gameActions.handleKickPlayer,
      setRoomName: gameActions.handleSetRoomName,
    },
  };
}
