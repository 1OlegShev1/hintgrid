"use client";

import { TeamLobby, EmojiPickerButton } from "@/components/room";
import ChatLog from "@/components/ChatLog";
import type { UseRtdbRoomReturn } from "@/hooks/useRtdbRoom";
import type { UseRoomDerivedStateReturn } from "@/hooks/useRoomDerivedState";
import { Card, Button } from "@/components/ui";

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
          <form onSubmit={chat.send} className="mt-3 pt-2 border-t border-border shrink-0">
            <div className="flex gap-2 items-center">
              <EmojiPickerButton
                onEmojiSelect={chat.onEmojiSelect}
                disabled={chat.isSending}
              />
              <input
                ref={chat.inputRef}
                type="text"
                value={chat.input}
                onChange={(e) => chat.setInput(e.target.value)}
                placeholder="Type message..."
                disabled={chat.isSending}
                className="flex-1 min-w-0 px-3 py-2.5 text-base border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-elevated text-foreground disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!chat.input.trim()}
                isLoading={chat.isSending}
                variant="primary"
                className="min-w-[60px]"
              >
                Send
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
