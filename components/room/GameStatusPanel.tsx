import { useState } from "react";
import type { GameState, Player } from "@/shared/types";
import { ConfirmModal, Button } from "@/components/ui";
import ClueInput from "./ClueInput";
import { PauseBanner } from "./PauseBanner";
import { GameOverPanel } from "./GameOverPanel";

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
            <Button
              onClick={onEndTurn}
              data-testid="game-end-turn-btn"
              variant="secondary"
              className="flex-1 sm:flex-none whitespace-nowrap"
            >
              End Turn
            </Button>
          )}
          {isRoomOwner && !gameState.gameOver && !gameState.paused && (
            <Button
              onClick={onPauseGame}
              data-testid="game-pause-btn"
              variant="warning"
              className="flex-1 sm:flex-none whitespace-nowrap"
            >
              Pause
            </Button>
          )}
          {isRoomOwner && !gameState.gameOver && (
            <Button
              onClick={() => setShowEndGameModal(true)}
              variant="danger"
              className="flex-1 sm:flex-none whitespace-nowrap"
            >
              End
            </Button>
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
      {gameState.paused && (
        <PauseBanner
          gameState={gameState}
          players={players}
          isRoomOwner={isRoomOwner}
          onResumeGame={onResumeGame}
        />
      )}
      
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
      
      {gameState.gameOver && (
        <GameOverPanel
          gameState={gameState}
          players={players}
          isRoomOwner={isRoomOwner}
          showGameOverOverlay={showGameOverOverlay}
          onRematch={onRematch}
          onEndGame={onEndGame}
        />
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
