"use client";

import { TeamLobby } from "@/components/room";
import type { UseRtdbRoomReturn } from "@/hooks/useRtdbRoom";
import type { UseRoomDerivedStateReturn } from "@/hooks/useRoomDerivedState";

interface LobbyViewProps {
  room: UseRtdbRoomReturn;
  derived: UseRoomDerivedStateReturn;
}

/**
 * Lobby view - displays before game starts.
 * Shows team selection and game settings.
 */
export function LobbyView({ room, derived }: LobbyViewProps) {
  const { gameState, players, currentPlayer } = room;
  const { isRoomOwner } = derived;

  if (!gameState) return null;

  return (
    <TeamLobby
      players={players}
      currentPlayer={currentPlayer}
      isRoomOwner={isRoomOwner}
      gameState={gameState}
      onSetRole={room.handleSetLobbyRole}
      onRandomize={room.handleRandomizeTeams}
      onStartGame={room.handleStartGame}
      onTimerPresetChange={room.handleTimerPresetChange}
      onWordPackChange={room.handleWordPackChange}
      showControls={true}
    />
  );
}
