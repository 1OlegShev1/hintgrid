"use client";

import { useRef, useState, useEffect } from "react";
import GameBoard from "@/components/GameBoard";
import ChatLog from "@/components/ChatLog";
import ClueHistory from "@/components/ClueHistory";
import {
  GameStatusPanel,
  TeamLobby,
  CompactTeams,
  EmojiPickerButton,
} from "@/components/room";
import type { UseRtdbRoomReturn } from "@/hooks/useRtdbRoom";
import type { UseRoomDerivedStateReturn } from "@/hooks/useRoomDerivedState";
import { Card, Button, getTeamClasses, getTeamTextClass } from "@/components/ui";
import { cn } from "@/lib/utils";

interface GameViewProps {
  room: UseRtdbRoomReturn;
  derived: UseRoomDerivedStateReturn;
  timer: {
    timeRemaining: number | null;
  };
  overlays: {
    clueAnimating: boolean;
    showGameOver: boolean;
  };
}

/**
 * Active game view - displays when game is in progress.
 * Includes game board, chat, status panel, and team info.
 */
export function GameView({ room, derived, timer, overlays }: GameViewProps) {
  const { gameState, players, currentPlayer, messages, chatInput, setChatInput, isSendingChat, chatInputRef } = room;
  const { isMyTurn, isRoomOwner, canVote, canGiveClue, requiredVotes, turnGlowClass } = derived;
  
  // Track board height to sync sidebar on desktop
  const boardRef = useRef<HTMLDivElement>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number | null>(null);
  
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    
    const updateHeight = () => {
      // Only apply on md+ screens (768px+)
      if (window.innerWidth >= 768) {
        const height = board.offsetHeight;
        if (height > 0) {
          setSidebarHeight(height);
        }
      } else {
        setSidebarHeight(null); // Use CSS default on mobile
      }
    };
    
    // Small delay to ensure board has rendered with final dimensions
    const timer = setTimeout(updateHeight, 100);
    
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(board);
    window.addEventListener("resize", updateHeight);
    
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  if (!gameState) return null;

  return (
    <>
      <GameStatusPanel
        gameState={gameState}
        timeRemaining={timer.timeRemaining}
        isMyTurn={isMyTurn}
        isRoomOwner={isRoomOwner}
        canGiveClue={canGiveClue}
        clueAnimating={overlays.clueAnimating}
        players={players}
        showGameOverOverlay={overlays.showGameOver}
        onEndTurn={room.handleEndTurn}
        onEndGame={room.handleEndGame}
        onPauseGame={room.handlePauseGame}
        onResumeGame={room.handleResumeGame}
        onRematch={room.handleRematch}
        onGiveClue={room.handleGiveClue}
      />

      {/* Game Over - Show Teams for Reassignment (above board) */}
      {gameState.gameOver && !overlays.showGameOver && (
        <div className="mb-4">
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
            onKickPlayer={room.handleKickPlayer}
            showControls={true}
          />
        </div>
      )}

      {/* Board and Chat */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div ref={boardRef} className="md:col-span-3">
          <Card variant="elevated" padding="lg" className={turnGlowClass}>
            <GameBoard
              board={gameState.board}
              currentPlayer={currentPlayer}
              currentTeam={gameState.currentTeam}
              cardVotes={gameState.cardVotes}
              currentPlayerId={currentPlayer?.id ?? null}
              requiredVotes={requiredVotes}
              canVote={canVote}
              onVoteCard={room.handleVoteCard}
              onConfirmReveal={room.handleConfirmReveal}
            />
            
            {/* Player/Team indicator below board - only show if player has team */}
            {currentPlayer?.team && currentPlayer?.role && (
              <div className="mt-4 flex justify-center">
                <div className={cn(
                  "inline-flex items-center gap-3 px-5 py-3 rounded-xl border-2 shadow-sm",
                  getTeamClasses(currentPlayer.team, "card")
                )}>
                  <span className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    getTeamTextClass(currentPlayer.team)
                  )}>
                    You are
                  </span>
                  <span className={cn(
                    "font-bold text-lg",
                    getTeamTextClass(currentPlayer.team)
                  )}>
                    {currentPlayer.team.toUpperCase()} {currentPlayer.role === "clueGiver" ? "Hinter" : "Seeker"}
                  </span>
                  <span className={cn(
                    "text-sm",
                    getTeamTextClass(currentPlayer.team)
                  )}>
                    ({currentPlayer.name})
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div 
          className="md:col-span-2 flex flex-col gap-4 h-[600px] md:h-auto overflow-hidden"
          style={sidebarHeight ? { height: sidebarHeight } : undefined}
        >
          <Card variant="elevated" padding="md" className="overflow-hidden flex flex-col" style={{ height: 'calc(50% - 8px)', minHeight: 0 }}>
            <ClueHistory clues={messages} />
          </Card>
          <Card variant="elevated" padding="md" className="overflow-hidden flex flex-col" style={{ height: 'calc(50% - 8px)', minHeight: 0 }}>
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
      </div>

      {/* Show compact teams only during active game (not paused, not game over) */}
      {!gameState.gameOver && !gameState.paused && (
        <CompactTeams 
          players={players} 
          currentPlayerId={currentPlayer?.id}
          isRoomOwner={isRoomOwner}
          onAddSpectator={(team, playerId) => room.handleSetLobbyRole(team, "guesser", playerId)}
          onKickPlayer={room.handleKickPlayer}
        />
      )}

      {/* Game Paused - Show Teams for Role Reassignment */}
      {gameState.paused && !gameState.gameOver && (
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
          onKickPlayer={room.handleKickPlayer}
          showControls={true}
          hidePauseHeader={true}
        />
      )}
    </>
  );
}
