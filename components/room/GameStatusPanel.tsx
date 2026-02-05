import { useState } from "react";
import type { GameState, Player } from "@/shared/types";
import GameStats from "@/components/GameStats";
import { ConfirmModal } from "@/components/ui";
import ClueInput from "./ClueInput";

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
    ? "border-red-400 bg-red-50/70 dark:bg-red-900/20"
    : "border-blue-400 bg-blue-50/70 dark:bg-blue-900/20";
  
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
      <div className="p-4 sm:p-6">
      {/* Mobile: Stack vertically | Desktop: Single row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        {/* Row 1 (mobile) / Left side (desktop): Scores + Timer */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded font-bold ${
              !gameState.gameOver && gameState.currentTeam === "red" 
                ? "bg-red-team text-white" 
                : "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
            }`}>
              Red: {redRemaining}
            </span>
            <span className={`px-3 py-1 rounded font-bold ${
              !gameState.gameOver && gameState.currentTeam === "blue" 
                ? "bg-blue-team text-white" 
                : "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
            }`}>
              Blue: {blueRemaining}
            </span>
          </div>
          {timeRemaining !== null && (
            <div
              role="timer"
              aria-live={!gameState.paused && timeRemaining <= 10 && timeRemaining > 0 ? "assertive" : "off"}
              aria-label={`${Math.floor(timeRemaining / 60)} minutes ${timeRemaining % 60} seconds remaining`}
              className={`
              text-xl font-mono flex items-center gap-2
              ${gameState.paused ? "text-amber-600 dark:text-amber-400" : ""}
              ${!gameState.paused && timeRemaining <= 10 && timeRemaining > 0 ? "timer-urgent text-red-600 font-bold" : ""}
            `}>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
              {gameState.paused && (
                <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                  PAUSED
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Row 2 (mobile) / Right side (desktop): Action buttons */}
        <div className="flex items-center gap-2">
          {isMyTurn && (
            <button
              onClick={onEndTurn}
              data-testid="game-end-turn-btn"
              className="flex-1 sm:flex-none bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all whitespace-nowrap"
            >
              End Turn
            </button>
          )}
          {isRoomOwner && !gameState.gameOver && !gameState.paused && (
            <button
              onClick={onPauseGame}
              data-testid="game-pause-btn"
              className="flex-1 sm:flex-none bg-amber-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-amber-600 transition-all whitespace-nowrap"
            >
              Pause
            </button>
          )}
          {isRoomOwner && !gameState.gameOver && (
            <button
              onClick={() => setShowEndGameModal(true)}
              className="flex-1 sm:flex-none bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all whitespace-nowrap"
            >
              End
            </button>
          )}
        </div>
      </div>

      {/* Clue display (when present) */}
      {gameState.currentClue && (
        <div className={`
          flex items-center justify-center gap-3 bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-400 dark:border-amber-600 rounded-lg px-4 py-2 mb-4
          ${clueAnimating ? "clue-announce" : ""}
        `}>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">Clue</span>
          <span className="font-bold text-xl text-amber-900 dark:text-amber-100">{gameState.currentClue.word}</span>
          <span className="bg-amber-600 text-white text-sm font-bold px-2 py-0.5 rounded-full">{gameState.currentClue.count}</span>
          {gameState.remainingGuesses !== null && (
            <span className="text-sm text-amber-700 dark:text-amber-300">
              ({gameState.remainingGuesses} left)
            </span>
          )}
        </div>
      )}
      
      {gameState.remainingGuesses !== null && !gameState.currentClue && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
          Guesses left: {gameState.remainingGuesses}
        </div>
      )}
      
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
          <div className="bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-600 rounded-lg p-4 text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-lg font-bold text-amber-800 dark:text-amber-200">Game Paused</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
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
                  <button
                    onClick={onResumeGame}
                    data-testid="game-resume-btn"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all"
                  >
                    Resume Game
                  </button>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
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
            ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
            : "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
        }`}>
          <p className={`text-sm font-medium ${
            gameState.currentTeam === "red"
              ? "text-red-800 dark:text-red-200"
              : "text-blue-800 dark:text-blue-200"
          }`}>
            ⏳ Waiting for {gameState.currentTeam} team hinter to give a hint...
          </p>
        </div>
      )}
      
      {gameState.gameOver && !showGameOverOverlay && (
        <div data-testid="game-over-panel" className="bg-white dark:bg-gray-800 border-2 border-yellow-400 rounded-lg p-6">
          <h3 data-testid="game-winner-text" className="text-2xl font-bold text-center mb-6">
            🎮 Game Over! {gameState.winner?.toUpperCase()} Team Wins!
          </h3>
          
          {/* Game Stats */}
          <GameStats 
            board={gameState.board} 
            players={players} 
            winner={gameState.winner}
          />
          
          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            {isRoomOwner && (
              <div className="flex items-center justify-center gap-3">
                {onRematch && (
                  <button
                    onClick={onRematch}
                    data-testid="game-rematch-btn"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all"
                  >
                    Rematch
                  </button>
                )}
                <button
                  onClick={onEndGame}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all"
                >
                  Back to Lobby
                </button>
              </div>
            )}
            {!isRoomOwner && (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
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
        confirmVariant="danger"
        icon="warning"
      />
    </div>
  );
}
