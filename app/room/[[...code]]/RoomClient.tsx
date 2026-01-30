"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import TransitionOverlay from "@/components/TransitionOverlay";
import { useRtdbRoom } from "@/hooks/useRtdbRoom";
import { goOffline, goOnline } from "@/lib/firebase";
import { useGameTimer } from "@/hooks/useGameTimer";
import { useFirebaseConnection } from "@/hooks/useFirebaseConnection";
import { useTransitionOverlays } from "@/hooks/useTransitionOverlays";
import { useTimerSound } from "@/hooks/useTimerSound";
import { useRoomDerivedState } from "@/hooks/useRoomDerivedState";
import { useSoundContextOptional, type MusicTrack } from "@/contexts/SoundContext";
import { LOCAL_STORAGE_AVATAR_KEY, getRandomAvatar } from "@/shared/constants";
import {
  RoomHeader,
  RoomClosedModal,
  JoinRoomForm,
  ConnectionStatus,
  GameView,
  LobbyView,
  IdleWarningModal,
} from "@/components/room";
import OfflineBanner from "@/components/OfflineBanner";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";

// 1 hour idle timeout (only active in lobby, not during game)
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;

export default function RoomPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Extract room code from pathname: /room/ABC123 -> ABC123
  const roomCode = pathname?.split("/room/")[1]?.split("/")[0] || "";
  const playerName = searchParams.get("name") || "";

  // Get avatar from localStorage (or random default)
  const [playerAvatar, setPlayerAvatar] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_AVATAR_KEY);
    if (stored) {
      setPlayerAvatar(stored);
    } else {
      const random = getRandomAvatar();
      setPlayerAvatar(random);
      localStorage.setItem(LOCAL_STORAGE_AVATAR_KEY, random);
    }
  }, []);

  // Custom hooks - only join room once avatar is loaded to prevent re-join race condition
  const room = useRtdbRoom(roomCode, playerName, playerAvatar || "");
  const derived = useRoomDerivedState(room.gameState, room.currentPlayer, room.players);
  const firebaseConnection = useFirebaseConnection();

  // Determine who should trigger timeouts:
  // - Primary: the owner (if connected)
  // - Fallback: first connected player by ID (if owner is disconnected)
  const shouldTriggerTimeout = useMemo(() => {
    if (firebaseConnection !== "connected") return false;
    if (room.currentPlayer?.connected === false) return false;
    if (!room.currentPlayer?.id) return false;

    // If I'm the owner, I trigger
    if (derived.isRoomOwner) return true;

    // Check if owner is disconnected
    const ownerPlayer = room.players.find((p) => p.id === room.gameState?.ownerId);
    const ownerConnected = ownerPlayer?.connected !== false;
    if (ownerConnected) return false;

    // Owner is disconnected - am I the first connected player by ID?
    const connectedPlayerIds = room.players
      .filter((p) => p.connected !== false)
      .map((p) => p.id)
      .sort();
    return connectedPlayerIds[0] === room.currentPlayer.id;
  }, [
    firebaseConnection,
    room.currentPlayer?.connected,
    room.currentPlayer?.id,
    room.players,
    room.gameState?.ownerId,
    derived.isRoomOwner,
  ]);

  const timer = useGameTimer(room.gameState, room.handleEndTurn, { shouldTriggerTimeout });
  const overlays = useTransitionOverlays(room.gameState, room.currentPlayer?.team ?? null);
  
  // Timer tick sounds
  useTimerSound({
    timeRemaining: timer.timeRemaining,
    isPaused: room.gameState?.paused,
    isGameOver: room.gameState?.gameOver,
  });

  // Idle timeout - only active in lobby (not during game)
  // Shows warning after 1 hour of inactivity, then redirects to home
  const isInActiveGame = room.gameState?.gameStarted && !room.gameState?.gameOver;
  const { isIdle, resetIdleTimer } = useIdleTimeout({
    timeout: IDLE_TIMEOUT_MS,
    enabled: !!playerName && !isInActiveGame, // Only track when in lobby
  });

  // Leave room handler - triggers clean Firebase disconnect
  const handleLeaveRoom = () => {
    console.log("[Room] Leave button clicked - disconnecting...");
    goOffline(); // Triggers onDisconnect immediately (clean disconnect)
    // Reconnect so home page can work normally
    setTimeout(() => goOnline(), 100);
    router.push("/");
  };

  // Handle idle warning responses
  const handleIdleStay = () => {
    resetIdleTimer();
  };

  const handleIdleLeave = () => {
    // For idle timeout, just navigate away - onDisconnect will handle cleanup
    // Don't call goOffline() as it disconnects Firebase entirely
    router.push("/");
  };

  // Background music - changes based on game state
  // Only plays when player has actually joined the room (has playerName)
  const soundContext = useSoundContextOptional();
  const setMusicTrack = soundContext?.setMusicTrack;
  
  // Track whether gameState exists (for dependency tracking)
  const hasGameState = !!room.gameState;
  const gameStarted = room.gameState?.gameStarted ?? false;
  const gameOver = room.gameState?.gameOver ?? false;
  const timerPreset = room.gameState?.timerPreset ?? "normal";
  
  useEffect(() => {
    if (!setMusicTrack) return;
    
    // Don't play music until player has joined (entered their name)
    if (!playerName) {
      setMusicTrack(null);
      return;
    }
    
    // No game state yet
    if (!hasGameState) {
      setMusicTrack(null);
      return;
    }
    
    let track: MusicTrack = null;
    
    if (gameOver) {
      track = "victory";
    } else if (gameStarted) {
      // Select track based on timer preset
      // fast → upbeat 30s track, normal → balanced 60s, relaxed → chill 90s
      if (timerPreset === "fast") {
        track = "game-30s";
      } else if (timerPreset === "normal") {
        track = "game-60s";
      } else {
        track = "game-90s";
      }
    } else {
      // In lobby
      track = "lobby";
    }
    
    setMusicTrack(track);
  }, [playerName, hasGameState, gameStarted, gameOver, timerPreset, setMusicTrack]);

  // Early returns for special states
  if (room.roomClosedReason) {
    return <RoomClosedModal reason={room.roomClosedReason} />;
  }

  if (!playerName) {
    return (
      <JoinRoomForm
        roomCode={roomCode}
        onJoin={(name, avatar) => {
          localStorage.setItem(LOCAL_STORAGE_AVATAR_KEY, avatar);
          router.replace(`/room/${roomCode}?name=${encodeURIComponent(name)}`);
        }}
      />
    );
  }

  if (!room.gameState) {
    return (
      <ConnectionStatus
        isConnecting={room.isConnecting}
        connectionError={room.connectionError}
      />
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Transition Overlays */}
      {overlays.showGameStart && (
        <TransitionOverlay
          type="gameStart"
          team={overlays.transitionTeam}
          onComplete={overlays.dismissGameStart}
        />
      )}
      {overlays.showTurnChange && (
        <TransitionOverlay
          type="turnChange"
          team={overlays.transitionTeam}
          onComplete={overlays.dismissTurnChange}
        />
      )}
      {overlays.showGameOver && (
        <TransitionOverlay
          type="gameOver"
          team={overlays.transitionTeam}
          isWinner={overlays.isWinner}
          lostByTrap={overlays.lostByTrap}
          onComplete={overlays.dismissGameOver}
        />
      )}

      {/* Idle Warning Modal - shows after 1 hour of inactivity in lobby */}
      {isIdle && (
        <IdleWarningModal
          onStay={handleIdleStay}
          onLeave={handleIdleLeave}
        />
      )}
      
      <div className="max-w-6xl mx-auto">
        <RoomHeader roomCode={roomCode} currentPlayer={room.currentPlayer} isRoomOwner={derived.isRoomOwner} isLocked={room.gameState.locked} onSetRoomLocked={room.handleSetRoomLocked} onLeaveRoom={handleLeaveRoom} />
        <OfflineBanner />

        {room.gameState.gameStarted ? (
          <GameView 
            room={room} 
            derived={derived} 
            timer={timer}
            overlays={overlays}
          />
        ) : (
          <LobbyView 
            room={room} 
            derived={derived} 
          />
        )}
      </div>
    </main>
  );
}
