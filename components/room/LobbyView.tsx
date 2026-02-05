"use client";

import { TeamLobby, ChatInput } from "@/components/room";
import ChatLog from "@/components/ChatLog";
import type { UseRtdbRoomReturn } from "@/hooks/useRtdbRoom";
import type { UseRoomDerivedStateReturn } from "@/hooks/useRoomDerivedState";
import { Card } from "@/components/ui";

interface LobbyViewProps {
  room: UseRtdbRoomReturn;
  derived: UseRoomDerivedStateReturn;
}

/**
 * Lobby view - displays before game starts.
 * Shows team selection and game settings.
 */
export function LobbyView({ room, derived }: LobbyViewProps) {
  const { state, chat, actions } = room;
  const { gameState, players, currentPlayer, messages } = state;
  const { isRoomOwner } = derived;

  if (!gameState) return null;

  return (
    <>
      <TeamLobby
        players={players}
        currentPlayer={currentPlayer}
        isRoomOwner={isRoomOwner}
        gameState={gameState}
        onSetRole={actions.setLobbyRole}
        onRandomize={actions.randomizeTeams}
        onStartGame={actions.startGame}
        onTimerPresetChange={actions.timerPresetChange}
        onWordPackChange={actions.wordPackChange}
        onCustomWordsChange={actions.customWordsChange}
        onKickPlayer={actions.kickPlayer}
        showControls={true}
      />

      {/* Chat Section */}
      <div className="mt-6 max-w-4xl mx-auto">
        <Card variant="elevated" padding="md" className="flex flex-col h-[350px]">
          <ChatLog
            messages={messages}
            players={players}
            currentPlayerId={currentPlayer?.id}
            onAddReaction={chat.addReaction}
            onRemoveReaction={chat.removeReaction}
          />
          <ChatInput chat={chat} />
        </Card>
      </div>
    </>
  );
}
