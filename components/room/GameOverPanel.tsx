import type { GameState, Player } from "@/shared/types";
import GameStats from "@/components/GameStats";
import { Button } from "@/components/ui";

interface GameOverPanelProps {
  gameState: GameState;
  players: Player[];
  isRoomOwner: boolean;
  showGameOverOverlay: boolean;
  onRematch?: () => void;
  onEndGame: () => void;
}

export function GameOverPanel({
  gameState,
  players,
  isRoomOwner,
  showGameOverOverlay,
  onRematch,
  onEndGame,
}: GameOverPanelProps) {
  if (showGameOverOverlay) return null;

  return (
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
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Waiting for room owner to start rematch or return to lobby...
          </p>
        )}
      </div>
    </div>
  );
}
