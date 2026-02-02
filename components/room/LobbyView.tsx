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
  const { gameState, players, currentPlayer, messages, chatInput, setChatInput, isSendingChat, chatInputRef } = room;
  const { isRoomOwner } = derived;

  if (!gameState) return null;

  return (
    <>
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
        onCustomWordsChange={room.handleCustomWordsChange}
        onKickPlayer={room.handleKickPlayer}
        showControls={true}
      />

      {/* Chat Section */}
      <div className="mt-6 max-w-4xl mx-auto">
        <Card variant="elevated" padding="md" className="flex flex-col h-[350px]">
          <ChatLog
            messages={messages}
            players={players}
            currentPlayerId={currentPlayer?.id}
            onAddReaction={room.handleAddReaction}
            onRemoveReaction={room.handleRemoveReaction}
          />
          <form onSubmit={room.handleSendMessage} className="mt-3 pt-2 border-t border-border shrink-0">
            <div className="flex gap-2 items-center">
              <EmojiPickerButton
                onEmojiSelect={room.handleEmojiSelect}
                disabled={isSendingChat}
              />
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type message..."
                disabled={isSendingChat}
                className="flex-1 min-w-0 px-3 py-2.5 text-base border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-elevated text-foreground disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!chatInput.trim()}
                isLoading={isSendingChat}
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
