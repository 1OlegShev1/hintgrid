"use client";

import { useRef, useState, useEffect } from "react";
import GameBoard from "@/components/GameBoard";
import ChatLog from "@/components/ChatLog";
import ClueHistory from "@/components/ClueHistory";
import {
  GameStatusPanel,
  TeamLobby,
  CompactTeams,
  ChatInput,
} from "@/components/room";
import type { UseRtdbRoomReturn } from "@/hooks/useRtdbRoom";
import type { UseRoomDerivedStateReturn } from "@/hooks/useRoomDerivedState";
import { Card, getTeamClasses, getTeamTextClass } from "@/components/ui";
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
  const { state, chat, actions } = room;
  const { gameState, players, currentPlayer, messages } = state;
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
        onEndTurn={actions.endTurn}
        onEndGame={actions.endGame}
        onPauseGame={actions.pauseGame}
        onResumeGame={actions.resumeGame}
        onRematch={actions.rematch}
        onGiveClue={actions.giveClue}
      />

      {/* Game Over - Show Teams for Reassignment (above board) */}
      {gameState.gameOver && !overlays.showGameOver && (
        <div className="mb-4">
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
            onKickPlayer={actions.kickPlayer}
            showControls={true}
          />
        </div>
      )}

      {/* Board and Chat */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div ref={boardRef} className="md:col-span-3 -mx-5 sm:mx-0">
          <Card variant="elevated" padding="lg" className={cn("p-1.5! sm:p-6!", turnGlowClass)}>
            <GameBoard
              board={gameState.board}
              currentPlayer={currentPlayer}
              cardVotes={gameState.cardVotes}
              currentPlayerId={currentPlayer?.id ?? null}
              requiredVotes={requiredVotes}
              canVote={canVote}
              onVoteCard={actions.voteCard}
              onConfirmReveal={actions.confirmReveal}
            />
            
            {/* Player/Team indicator below board - only show if player has team */}
            {currentPlayer?.team && currentPlayer?.role && (
              <div className="mt-3 sm:mt-4 flex justify-center">
                <div className={cn(
                  "inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 rounded-xl border-2 shadow-sm",
                  getTeamClasses(currentPlayer.team, "card")
                )}>
                  <span className={cn(
                    "text-xs font-medium uppercase tracking-wide hidden sm:inline",
                    getTeamTextClass(currentPlayer.team)
                  )}>
                    You are
                  </span>
                  <span className={cn(
                    "font-bold text-base sm:text-lg",
                    getTeamTextClass(currentPlayer.team)
                  )}>
                    {currentPlayer.team.toUpperCase()} {currentPlayer.role === "clueGiver" ? "Hinter" : "Seeker"}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div 
          className="md:col-span-2 flex flex-col gap-4 h-[720px] md:h-auto overflow-hidden"
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
              onAddReaction={chat.addReaction}
              onRemoveReaction={chat.removeReaction}
            />
            <ChatInput chat={chat} />
          </Card>
        </div>
      </div>

      {/* Show compact teams only during active game (not paused, not game over) */}
      {!gameState.gameOver && !gameState.paused && (
        <CompactTeams 
          players={players} 
          currentPlayerId={currentPlayer?.id}
          isRoomOwner={isRoomOwner}
          onAddSpectator={(team, playerId) => actions.setLobbyRole(team, "guesser", playerId)}
          onKickPlayer={actions.kickPlayer}
        />
      )}

      {/* Game Paused - Show Teams for Role Reassignment */}
      {gameState.paused && !gameState.gameOver && (
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
          onKickPlayer={actions.kickPlayer}
          showControls={true}
          hidePauseHeader={true}
        />
      )}
    </>
  );
}
