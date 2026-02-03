import { useState } from "react";
import type { GameState, Player } from "@/shared/types";
import GameStats from "@/components/GameStats";
import ClueInput from "./ClueInput";
import { Button, ConfirmModal, Badge, getTeamClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

interface GameStatusPanelProps {
  gameState: GameState;
  timeRemaining: number | null;
  isMyTurn: boolean;
  isRoomOwner: boolean;
  canGiveClue: boolean;
  clueAnimating: boolean;
  players: Player[];
  showGameOverOverlay?: boolean;
  onEndTurn: () => void;
  onEndGame: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onRematch?: () => void;
  onGiveClue: (word: string, count: number) => void;
}

export default function GameStatusPanel({
  gameState,
  timeRemaining,
  isMyTurn,
  isRoomOwner,
  canGiveClue,
  clueAnimating,
  players,
  showGameOverOverlay = false,
  onEndTurn,
  onEndGame,
  onPauseGame,
  onResumeGame,
  onRematch,
  onGiveClue,
}: GameStatusPanelProps) {
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const turnHighlightClass = gameState.currentTeam === "red"
    ? "border-red-team bg-red-team-light/70"
    : "border-blue-team bg-blue-team-light/70";
  
  const turnBannerClass = gameState.currentTeam === "red"
    ? "bg-red-team text-white"
    : "bg-blue-team text-white";

  // Calculate remaining cards for each team
  const redRemaining = gameState.board.filter(
    (card) => card.team === "red" && !card.revealed
  ).length;
  const blueRemaining = gameState.board.filter(
    (card) => card.team === "blue" && !card.revealed
  ).length;

  return (
    <div className={`border-2 rounded-2xl shadow-xl overflow-hidden mb-4 ${turnHighlightClass}`}>
      {/* Turn indicator banner */}
      {!gameState.gameOver && (
        <div className={`px-4 py-2 flex items-center justify-center gap-2 ${turnBannerClass}`}>
          <span className="font-bold text-lg uppercase tracking-wide">
            {gameState.currentTeam} Team's Turn
          </span>
          {!gameState.currentClue && (
            <span className="text-sm opacity-90">— Waiting for clue</span>
          )}
          {gameState.currentClue && (
            <span className="text-sm opacity-90">— Guessing</span>
          )}
        </div>
      )}
      <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Score display */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded font-bold ${
              !gameState.gameOver && gameState.currentTeam === "red" 
                ? "bg-red-team text-white" 
                : "bg-red-team-light text-red-team-text"
            }`}>
              Red: {redRemaining}
            </span>
            <span className={`px-3 py-1 rounded font-bold ${
              !gameState.gameOver && gameState.currentTeam === "blue" 
                ? "bg-blue-team text-white" 
                : "bg-blue-team-light text-blue-team-text"
            }`}>
              Blue: {blueRemaining}
            </span>
          </div>
          {timeRemaining !== null && (
            <div className={`
              text-lg font-mono flex items-center gap-2
              ${gameState.paused ? "text-warning" : ""}
              ${!gameState.paused && timeRemaining <= 10 && timeRemaining > 0 ? "timer-urgent text-error font-bold" : ""}
            `}>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
              {gameState.paused && (
                <span className="text-xs font-semibold bg-warning/20 text-warning px-2 py-0.5 rounded">
                  PAUSED
                </span>
              )}
            </div>
          )}
          {gameState.currentClue && (
            <div className={`
              flex items-center gap-3 bg-warning/20 border-2 border-warning rounded-lg px-4 py-2
              ${clueAnimating ? "clue-announce" : ""}
            `}>
              <span className="text-xs font-medium text-warning uppercase tracking-wide">Clue</span>
              <span className="font-bold text-xl text-highlight-text">{gameState.currentClue.word}</span>
              <span className="bg-warning text-warning-foreground text-sm font-bold px-2 py-0.5 rounded-full">{gameState.currentClue.count}</span>
              {gameState.remainingGuesses !== null && (
                <span className="text-sm text-warning ml-2">
                  {gameState.remainingGuesses} guess{gameState.remainingGuesses !== 1 ? 'es' : ''} left
                </span>
              )}
            </div>
          )}
          {gameState.remainingGuesses !== null && !gameState.currentClue && (
            <div className="text-sm text-muted">
              Guesses left: {gameState.remainingGuesses}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isMyTurn && (
            <Button
              onClick={onEndTurn}
              data-testid="game-end-turn-btn"
              variant="secondary"
            >
              End Turn
            </Button>
          )}
          {isRoomOwner && !gameState.gameOver && !gameState.paused && (
            <Button
              onClick={onPauseGame}
              data-testid="game-pause-btn"
              variant="warning"
            >
              Pause
            </Button>
          )}
          {isRoomOwner && !gameState.gameOver && (
            <Button
              onClick={() => setShowEndGameModal(true)}
              variant="danger"
            >
              End Game
            </Button>
          )}
        </div>
      </div>
      
      {/* Game Paused Banner */}
      {gameState.paused && (() => {
        // Check if conditions are met to resume
        const pausedTeam = gameState.pausedForTeam;
        const teamPlayers = players.filter((p) => p.team === pausedTeam);
        // connected !== false treats undefined as connected (backwards compatible)
        const hasClueGiver = teamPlayers.some((p) => p.role === "clueGiver" && p.connected !== false);
        const hasGuesser = teamPlayers.some((p) => p.role === "guesser" && p.connected !== false);
        const canResume = hasClueGiver && hasGuesser;
        
        return (
          <div className="bg-warning/20 border-2 border-warning rounded-lg p-4 text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-5 h-5 text-warning animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-lg font-bold text-highlight-text">Game Paused</span>
            </div>
            <p className="text-sm text-warning mb-3">
              {gameState.pauseReason === "ownerPaused" && (
                <>Game paused by room owner. Click Resume when ready to continue.</>
              )}
              {gameState.pauseReason === "teamDisconnected" && (
                <>{gameState.pausedForTeam?.toUpperCase()} team has no connected players. Waiting for reconnection...</>
              )}
              {gameState.pauseReason === "clueGiverDisconnected" && (
                <>{gameState.pausedForTeam?.toUpperCase()} team hinter disconnected. Waiting for reconnection...</>
              )}
              {gameState.pauseReason === "noGuessers" && (
                <>{gameState.pausedForTeam?.toUpperCase()} team has no connected guessers. Waiting for reconnection...</>
              )}
            </p>
            {isRoomOwner && (
              <div className="mt-2">
                {canResume ? (
                  <Button
                    onClick={onResumeGame}
                    data-testid="game-resume-btn"
                    variant="success"
                  >
                    Resume Game
                  </Button>
                ) : (
                  <p className="text-xs text-warning">
                    Need a connected hinter and at least one connected seeker to resume
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })()}
      
      {gameState.gameStarted && !gameState.gameOver && !gameState.paused && !gameState.currentClue && !canGiveClue && (
        <div className={`rounded-lg p-3 text-center mb-4 border-2 ${
          gameState.currentTeam === "red"
            ? "bg-red-team-light border-red-team/50"
            : "bg-blue-team-light border-blue-team/50"
        }`}>
          <p className={`text-sm font-medium ${
            gameState.currentTeam === "red"
              ? "text-red-team-text"
              : "text-blue-team-text"
          }`}>
            ⏳ Waiting for {gameState.currentTeam} team hinter to give a hint...
          </p>
        </div>
      )}
      
      {gameState.gameOver && !showGameOverOverlay && (
        <div data-testid="game-over-panel" className="bg-surface-elevated border-2 border-warning rounded-lg p-6">
          <h3 data-testid="game-winner-text" className="text-2xl font-bold text-center mb-6 text-foreground">
            🎮 Game Over! {gameState.winner?.toUpperCase()} Team Wins!
          </h3>
          
          {/* Game Stats */}
          <GameStats 
            board={gameState.board} 
            players={players} 
            winner={gameState.winner}
          />
          
          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-border">
            {isRoomOwner && (
              <div className="flex items-center justify-center gap-3">
                {onRematch && (
                  <Button
                    onClick={onRematch}
                    data-testid="game-rematch-btn"
                    variant="success"
                  >
                    Rematch
                  </Button>
                )}
                <Button
                  onClick={onEndGame}
                  variant="secondary"
                >
                  Back to Lobby
                </Button>
              </div>
            )}
            {!isRoomOwner && (
              <p className="text-sm text-muted text-center">
                Waiting for room owner to start rematch or return to lobby...
              </p>
            )}
          </div>
        </div>
      )}
      
      {canGiveClue && (
        <ClueInput gameState={gameState} onGiveClue={onGiveClue} />
      )}
      </div>

      {/* End Game Confirmation Modal */}
      <ConfirmModal
        open={showEndGameModal}
        onClose={() => setShowEndGameModal(false)}
        onConfirm={() => {
          setShowEndGameModal(false);
          onEndGame();
        }}
        title="End Game?"
        message="This will end the current game for all players and return everyone to the lobby."
        confirmLabel="End Game"
        cancelLabel="Cancel"
        confirmVariant="danger"
        icon="danger"
      />
    </div>
  );
}
