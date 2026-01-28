import type { GameState, Player, WordPack, TimerPreset } from "@/shared/types";
import { TIMER_PRESETS, WORD_PACKS } from "@/shared/constants";
import { getPackDisplayName, getWordCount } from "@/shared/words";

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
  onResumeGame?: () => void;
  showControls?: boolean; // Hide start button in rematch mode
}

const timerPresetOptions: { label: string; value: TimerPreset }[] = [
  { label: `Fast (${TIMER_PRESETS.fast.clue}/${TIMER_PRESETS.fast.guess}s)`, value: "fast" },
  { label: `Normal (${TIMER_PRESETS.normal.clue}/${TIMER_PRESETS.normal.guess}s)`, value: "normal" },
  { label: `Relaxed (${TIMER_PRESETS.relaxed.clue}/${TIMER_PRESETS.relaxed.guess}s)`, value: "relaxed" },
];

// Word pack options with display names
const wordPackOptions: { label: string; value: WordPack }[] = WORD_PACKS.map(pack => ({
  label: getPackDisplayName(pack as WordPack),
  value: pack as WordPack,
}));

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
  onResumeGame,
  showControls = true,
}: TeamLobbyProps) {
  // Check if game is paused (mid-game role reassignment mode)
  const isPaused = gameState.gameStarted && gameState.paused && !gameState.gameOver;
  
  // Team management (join/leave/remove) is allowed when NOT in active gameplay.
  // Active gameplay = game started AND not paused AND not over.
  // Allowed in: Lobby, Paused, Game Over
  const isActiveGame = gameState.gameStarted && !gameState.paused && !gameState.gameOver;
  const isTeamManagementAllowed = !isActiveGame;
  
  // Check if the paused team has required roles filled
  const pausedTeam = gameState.pausedForTeam;
  const pausedTeamPlayers = players.filter((p) => p.team === pausedTeam);
  // connected !== false treats undefined as connected (backwards compatible)
  const hasClueGiver = pausedTeamPlayers.some((p) => p.role === "clueGiver" && p.connected !== false);
  const hasGuesser = pausedTeamPlayers.some((p) => p.role === "guesser" && p.connected !== false);
  const canResume = hasClueGiver && hasGuesser;
  
  // Owner can remove players from their team/role when team management is allowed
  // (Lobby, Paused, or Game Over). Cannot remove yourself.
  const canRemovePlayer = (playerId?: string) => {
    if (!isRoomOwner || !playerId || playerId === currentPlayer?.id) return false;
    return isTeamManagementAllowed;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      {/* Paused state header */}
      {isPaused && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">Game Paused - Assign Roles</h2>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
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
              <button
                onClick={onResumeGame}
                disabled={!canResume}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Resume Game
              </button>
            )}
          </div>
        </div>
      )}

      {/* Normal lobby header */}
      {showControls && !isPaused && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold">
            {gameState.gameOver ? "Teams — Reassign for Rematch" : `Teams (${players.length}/8)`}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Words:</span>
              {isRoomOwner ? (
                <div className="relative group">
                  <button
                    type="button"
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium flex items-center gap-1 min-w-[120px]"
                  >
                    <span className="truncate max-w-[150px]">
                      {gameState.wordPack.map(p => getPackDisplayName(p)).join(", ")}
                    </span>
                    <span className="text-gray-400 text-xs">({getWordCount(gameState.wordPack)})</span>
                    <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 min-w-[200px] hidden group-hover:block">
                    <div className="p-2 space-y-1">
                      {wordPackOptions.map((option) => {
                        const isSelected = gameState.wordPack.includes(option.value);
                        const packWordCount = getWordCount(option.value);
                        return (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                let newPacks: WordPack[];
                                if (isSelected) {
                                  // Don't allow deselecting the last pack
                                  if (gameState.wordPack.length > 1) {
                                    newPacks = gameState.wordPack.filter(p => p !== option.value);
                                  } else {
                                    return;
                                  }
                                } else {
                                  newPacks = [...gameState.wordPack, option.value];
                                }
                                onWordPackChange(newPacks);
                              }}
                              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium">{option.label}</span>
                            <span className="text-xs text-gray-500 ml-auto">{packWordCount}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
                      <span className="text-xs text-gray-500">
                        Total: {getWordCount(gameState.wordPack)} words
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {gameState.wordPack.map(p => getPackDisplayName(p)).join(", ")}
                  <span className="text-xs text-gray-500 ml-1">({getWordCount(gameState.wordPack)})</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Timer:</span>
              {isRoomOwner ? (
                <select
                  value={gameState.timerPreset}
                  onChange={(e) => onTimerPresetChange(e.target.value as TimerPreset)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium"
                >
                  {timerPresetOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {TIMER_PRESETS[gameState.timerPreset].label} ({TIMER_PRESETS[gameState.timerPreset].clue}/{TIMER_PRESETS[gameState.timerPreset].guess}s)
                </span>
              )}
            </div>
            {isRoomOwner && (
              <button
                onClick={onRandomize}
                disabled={players.length < 4}
                data-testid="lobby-randomize-btn"
                className="bg-gray-200 text-gray-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
              >
                Randomize
              </button>
            )}
            {/* Hide Start Game button when game is over (rematch is handled elsewhere) */}
            {isRoomOwner && showControls && !gameState.gameOver ? (
              <button
                onClick={onStartGame}
                disabled={players.filter((p) => p.team && p.role).length < 4}
                data-testid="lobby-start-btn"
                className="bg-green-600 text-white px-4 py-1.5 sm:px-6 sm:py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
              >
                Start Game
              </button>
            ) : showControls && !gameState.gameOver ? (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Only the room owner can start the game
              </span>
            ) : null}
          </div>
        </div>
      )}


      <div className="grid md:grid-cols-2 gap-6">
        {(["red", "blue"] as const).map((team) => {
          const clueGiver = players.find(
            (player) => player.team === team && player.role === "clueGiver"
          );
          const guessers = players.filter(
            (player) => player.team === team && player.role === "guesser"
          );
          const clueGiverOffline = clueGiver?.connected === false;

          return (
            <div
              key={team}
              className={`rounded-xl border-2 p-4 shadow-sm ${
                team === "red"
                  ? "border-red-400 bg-white dark:bg-gray-900"
                  : "border-blue-400 bg-white dark:bg-gray-900"
              }`}
            >
              <h3 className={`text-lg font-semibold mb-3 ${
                team === "red" ? "text-red-700 dark:text-red-300" : "text-blue-700 dark:text-blue-300"
              }`}>
                {team.toUpperCase()} TEAM
              </h3>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Hinter</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 ml-6">Sees all cards • Gives one-word hints</p>
                {clueGiver ? (
                  <div className={`rounded-lg p-3 text-base border ${
                    clueGiver.id === currentPlayer?.id
                      ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}>
                    <div className={`font-medium truncate flex items-center gap-2 ${
                      clueGiver.id === currentPlayer?.id ? "text-yellow-700 dark:text-yellow-300" : ""
                    } ${clueGiverOffline ? "opacity-60" : ""}`}>
                      <span className="text-xl">{clueGiver.avatar}</span>
                      <span>{clueGiver.name}{clueGiver.id === currentPlayer?.id ? " (you)" : ""}</span>
                      {clueGiverOffline && (
                        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">offline</span>
                      )}
                      {clueGiver.id === currentPlayer?.id && showControls && (
                        <button
                          type="button"
                          onClick={() => onSetRole(null, null)}
                          className="ml-auto text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          Leave
                        </button>
                      )}
                      {canRemovePlayer(clueGiver.id) && (
                        <button
                          type="button"
                          onClick={() => onSetRole(null, null, clueGiver.id)}
                          className="ml-auto text-xs font-semibold uppercase tracking-wide text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ) : showControls ? (
                  <button
                    onClick={() => onSetRole(team, "clueGiver")}
                    data-testid={`lobby-join-${team}-clueGiver`}
                    className={`w-full rounded-lg p-3 text-base border-2 border-dashed font-medium transition-all ${
                      team === "red"
                        ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600"
                        : "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-600"
                    }`}
                  >
                    Join as Hinter
                  </button>
                ) : (
                  <div className="rounded-lg p-3 text-base border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Open</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Seekers</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 ml-6">Find words based on hints</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {guessers.map((player) => (
                    <div
                      key={player.id}
                      className={`rounded-lg px-3 py-2 text-base border flex items-center gap-2 ${
                        player.id === currentPlayer?.id
                          ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 font-medium"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      } ${player.connected === false ? "opacity-60" : ""}`}
                    >
                      <span className="text-xl">{player.avatar}</span>
                      <span className="truncate">{player.name}{player.id === currentPlayer?.id ? " (you)" : ""}</span>
                      {player.connected === false && (
                        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">offline</span>
                      )}
                      {player.id === currentPlayer?.id && showControls && (
                        <button
                          type="button"
                          onClick={() => onSetRole(null, null)}
                          className="ml-auto text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          Leave
                        </button>
                      )}
                      {canRemovePlayer(player.id) && (
                        <button
                          type="button"
                          onClick={() => onSetRole(null, null, player.id)}
                          className="ml-auto text-xs font-semibold uppercase tracking-wide text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {showControls && (
                    <button
                      onClick={() => onSetRole(team, "guesser")}
                      data-testid={`lobby-join-${team}-guesser`}
                      className={`w-full rounded-lg px-3 py-2 text-base border-2 border-dashed font-medium transition-all ${
                        team === "red"
                          ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600"
                          : "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-600"
                      }`}
                    >
                      Join as Seeker
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(showControls || isPaused) && (
        <>
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-3">All Players</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  data-testid={`lobby-player-${player.name}`}
                  className={`rounded-lg px-3 py-2 text-base border min-w-0 ${
                  player.id === currentPlayer?.id
                    ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                } ${player.connected === false ? "opacity-60" : ""}`}>
                  <div className={`font-medium flex items-center gap-2 ${
                    player.id === currentPlayer?.id ? "text-yellow-700 dark:text-yellow-300" : ""
                  }`}>
                    <span className="text-2xl">{player.avatar}</span>
                    <span className="truncate">{player.name}{player.id === currentPlayer?.id ? " (you)" : ""}</span>
                    {player.connected === false && (
                      <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">offline</span>
                    )}
                    {canRemovePlayer(player.id) && player.team && player.role && (
                      <button
                        type="button"
                        onClick={() => onSetRole(null, null, player.id)}
                        className="ml-auto text-xs font-semibold uppercase tracking-wide text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {player.team && player.role && (
                    <div className={`text-sm mt-1 ml-9 ${
                      player.team === "red" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                    }`}>
                      {player.team} {player.role === "clueGiver" ? "hinter" : "seeker"}
                    </div>
                  )}
                  {!player.team || !player.role ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-9">
                      {isPaused ? "Spectator" : "No team selected"}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          {!isPaused && players.filter(p => p.team && p.role).length < 4 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Waiting for {4 - players.filter(p => p.team && p.role).length} more player{4 - players.filter(p => p.team && p.role).length !== 1 ? "s" : ""} to join teams...
            </p>
          )}
        </>
      )}
    </div>
  );
}
