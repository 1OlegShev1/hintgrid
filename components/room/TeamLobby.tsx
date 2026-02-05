import type { GameState, Player, WordPack, TimerPreset } from "@/shared/types";
import { getPackDisplayName, getWordCount } from "@/shared/words";
import { TIMER_PRESETS } from "@/shared/constants";
import { Button, Card } from "@/components/ui";
import { WordPackDropdown } from "./lobby/WordPackDropdown";
import { CustomWordsDropdown } from "./lobby/CustomWordsDropdown";
import { TimerDropdown } from "./lobby/TimerDropdown";
import { TeamCard } from "./lobby/TeamCard";
import { PlayerGrid } from "./lobby/PlayerGrid";

interface TeamLobbyProps {
  players: Player[];
  currentPlayer: Player | null;
  isRoomOwner: boolean;
  gameState: GameState;
  onSetRole: (team: "red" | "blue" | null, role: "clueGiver" | "guesser" | null, targetPlayerId?: string) => void;
  onRandomize: () => void;
  onStartGame: () => void;
  onTimerPresetChange: (preset: TimerPreset) => void;
  onWordPackChange: (packs: WordPack[]) => void;
  onCustomWordsChange?: (words: string[]) => void;
  onResumeGame?: () => void;
  onKickPlayer?: (playerId: string) => void;
  showControls?: boolean; // Hide start button in rematch mode
  hidePauseHeader?: boolean; // Hide pause header when GameStatusPanel already shows it
}

export default function TeamLobby({
  players,
  currentPlayer,
  isRoomOwner,
  gameState,
  onSetRole,
  onRandomize,
  onStartGame,
  onTimerPresetChange,
  onWordPackChange,
  onCustomWordsChange,
  onResumeGame,
  onKickPlayer,
  showControls = true,
  hidePauseHeader = false,
}: TeamLobbyProps) {
  // Check if game is paused (mid-game role reassignment mode)
  const isPaused = gameState.gameStarted && gameState.paused && !gameState.gameOver;
  
  // Team management is allowed when NOT in active gameplay
  const isActiveGame = gameState.gameStarted && !gameState.paused && !gameState.gameOver;
  const isTeamManagementAllowed = !isActiveGame;
  
  // Check if the paused team has required roles filled
  const pausedTeam = gameState.pausedForTeam;
  const pausedTeamPlayers = players.filter((p) => p.team === pausedTeam);
  const hasClueGiver = pausedTeamPlayers.some((p) => p.role === "clueGiver" && p.connected !== false);
  const hasGuesser = pausedTeamPlayers.some((p) => p.role === "guesser" && p.connected !== false);
  const canResume = hasClueGiver && hasGuesser;

  return (
    <Card variant="elevated" padding="lg">
      {/* Paused state header */}
      {isPaused && !hidePauseHeader && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">Game Paused - Assign Roles</h2>
              <p className="text-sm text-warning mt-1">
                {gameState.pauseReason === "ownerPaused" && <>Game paused by room owner</>}
                {gameState.pauseReason === "clueGiverDisconnected" && (
                  <>The {pausedTeam} team needs a hinter to continue</>
                )}
                {gameState.pauseReason === "noGuessers" && (
                  <>The {pausedTeam} team needs at least one seeker to continue</>
                )}
                {gameState.pauseReason === "teamDisconnected" && (
                  <>The {pausedTeam} team needs players to continue</>
                )}
              </p>
            </div>
            {isRoomOwner && onResumeGame && (
              <Button onClick={onResumeGame} disabled={!canResume} variant="success">
                Resume Game
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Normal lobby header */}
      {showControls && !isPaused && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold">
            {gameState.gameOver ? "Teams — Reassign for Rematch" : "Team Selection"}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {/* Word pack */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface">
              <span className="text-sm font-medium text-muted">Words:</span>
              {isRoomOwner ? (
                <WordPackDropdown
                  selectedPacks={gameState.wordPack}
                  onPackChange={onWordPackChange}
                />
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  {gameState.wordPack.length === 1
                    ? getPackDisplayName(gameState.wordPack[0])
                    : gameState.wordPack.map((p) => getPackDisplayName(p)).join(", ")}
                  <span className="text-xs text-muted ml-1">({getWordCount(gameState.wordPack)})</span>
                </span>
              )}
            </div>
            {/* Custom words */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface">
              <span className="text-sm font-medium text-muted">Custom:</span>
              {isRoomOwner && onCustomWordsChange ? (
                <CustomWordsDropdown
                  customWords={gameState.customWords}
                  onCustomWordsChange={onCustomWordsChange}
                />
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  {gameState.customWords.length || "0"}
                </span>
              )}
            </div>
            {/* Timer */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface">
              <span className="text-sm font-medium text-muted">Timer:</span>
              {isRoomOwner ? (
                <TimerDropdown
                  selectedPreset={gameState.timerPreset}
                  onPresetChange={onTimerPresetChange}
                />
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  {TIMER_PRESETS[gameState.timerPreset].label}
                </span>
              )}
            </div>
            {isRoomOwner && (
              <Button
                onClick={onRandomize}
                disabled={players.length < 4}
                data-testid="lobby-randomize-btn"
                variant="secondary"
                size="sm"
              >
                Randomize
              </Button>
            )}
            {/* Start / waiting message */}
            {isRoomOwner && showControls && !gameState.gameOver ? (
              <Button
                onClick={onStartGame}
                disabled={players.filter((p) => p.team && p.role).length < 4}
                data-testid="lobby-start-btn"
                variant="success"
                size="sm"
              >
                Start Game
              </Button>
            ) : showControls && !gameState.gameOver ? (
              <span className="text-sm text-muted">Only the room owner can start the game</span>
            ) : null}
          </div>
        </div>
      )}

      {/* Team cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {(["red", "blue"] as const).map((team) => (
          <TeamCard
            key={team}
            team={team}
            clueGiver={players.find((p) => p.team === team && p.role === "clueGiver")}
            guessers={players.filter((p) => p.team === team && p.role === "guesser")}
            currentPlayer={currentPlayer}
            showControls={showControls}
            isTeamManagementAllowed={isTeamManagementAllowed}
            isRoomOwner={isRoomOwner}
            onSetRole={onSetRole}
            onKickPlayer={onKickPlayer}
          />
        ))}
      </div>

      {/* All players grid */}
      {(showControls || isPaused) && (
        <>
          <PlayerGrid
            players={players}
            currentPlayer={currentPlayer}
            isRoomOwner={isRoomOwner}
            isPaused={isPaused}
            isTeamManagementAllowed={isTeamManagementAllowed}
            onSetRole={onSetRole}
            onKickPlayer={onKickPlayer}
          />
          {!isPaused && players.filter((p) => p.team && p.role).length < 4 && (
            <p className="text-sm text-muted mt-3">
              Waiting for {4 - players.filter((p) => p.team && p.role).length} more player
              {4 - players.filter((p) => p.team && p.role).length !== 1 ? "s" : ""} to join teams...
            </p>
          )}
        </>
      )}
    </Card>
  );
}
