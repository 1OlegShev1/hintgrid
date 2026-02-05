import { PauseCircle } from "lucide-react";
import type { GameState, Player } from "@/shared/types";
import { Button } from "@/components/ui";

interface PauseBannerProps {
  gameState: GameState;
  players: Player[];
  isRoomOwner: boolean;
  onResumeGame: () => void;
}

export function PauseBanner({ gameState, players, isRoomOwner, onResumeGame }: PauseBannerProps) {
  const pausedTeam = gameState.pausedForTeam;
  const teamPlayers = players.filter((p) => p.team === pausedTeam);
  // connected !== false treats undefined as connected (backwards compatible)
  const hasClueGiver = teamPlayers.some((p) => p.role === "clueGiver" && p.connected !== false);
  const hasGuesser = teamPlayers.some((p) => p.role === "guesser" && p.connected !== false);
  const canResume = hasClueGiver && hasGuesser;

  return (
    <div className="bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-600 rounded-lg p-4 text-center mb-4">
      <div className="flex items-center justify-center gap-2 mb-2">
        <PauseCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
        <span className="text-lg font-bold text-amber-800 dark:text-amber-200">Game Paused</span>
      </div>
      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
        {gameState.pauseReason === "teamDisconnected" && (
          <>{pausedTeam?.toUpperCase()} team has no connected players. Waiting for reconnection...</>
        )}
        {gameState.pauseReason === "clueGiverDisconnected" && (
          <>{pausedTeam?.toUpperCase()} team hinter disconnected. Waiting for reconnection...</>
        )}
        {gameState.pauseReason === "noGuessers" && (
          <>{pausedTeam?.toUpperCase()} team has no connected guessers. Waiting for reconnection...</>
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
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Need a connected hinter and at least one connected seeker to resume
            </p>
          )}
        </div>
      )}
    </div>
  );
}
