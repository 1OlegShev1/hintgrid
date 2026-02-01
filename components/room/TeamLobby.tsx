import { useState, useRef, useEffect } from "react";
import type { GameState, Player, WordPack, TimerPreset } from "@/shared/types";
import { TIMER_PRESETS, WORD_PACKS, MAX_CUSTOM_WORDS_ON_BOARD } from "@/shared/constants";
import { getPackDisplayName, getWordCount } from "@/shared/words";
import { parseCustomWordsInput } from "@/shared/validation";
import { Button, Card } from "@/components/ui";

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
  onCustomWordsChange,
  onResumeGame,
  onKickPlayer,
  showControls = true,
  hidePauseHeader = false,
}: TeamLobbyProps) {
  // Dropdown states
  const [isWordPackOpen, setIsWordPackOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isCustomWordsOpen, setIsCustomWordsOpen] = useState(false);
  const wordPackRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const customWordsRef = useRef<HTMLDivElement>(null);
  
  // Custom words state
  const [customWordsInput, setCustomWordsInput] = useState("");
  const [customWordsErrors, setCustomWordsErrors] = useState<string[]>([]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wordPackRef.current && !wordPackRef.current.contains(event.target as Node)) {
        setIsWordPackOpen(false);
      }
      if (timerRef.current && !timerRef.current.contains(event.target as Node)) {
        setIsTimerOpen(false);
      }
      if (customWordsRef.current && !customWordsRef.current.contains(event.target as Node)) {
        setIsCustomWordsOpen(false);
      }
    }
    if (isWordPackOpen || isTimerOpen || isCustomWordsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isWordPackOpen, isTimerOpen, isCustomWordsOpen]);
  
  // Custom words handlers
  const handleAddCustomWords = () => {
    if (!customWordsInput.trim() || !onCustomWordsChange) return;
    
    const { words, errors } = parseCustomWordsInput(customWordsInput, gameState.customWords);
    setCustomWordsErrors(errors);
    
    if (words.length > 0) {
      onCustomWordsChange([...gameState.customWords, ...words]);
      setCustomWordsInput("");
    }
  };
  
  const handleRemoveCustomWord = (word: string) => {
    if (!onCustomWordsChange) return;
    onCustomWordsChange(gameState.customWords.filter(w => w !== word));
  };
  
  const handleClearAllCustomWords = () => {
    if (!onCustomWordsChange) return;
    onCustomWordsChange([]);
    setCustomWordsErrors([]);
  };

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

  // Owner can kick any player from the room (except themselves)
  const canKickPlayer = (playerId?: string) => {
    if (!isRoomOwner || !onKickPlayer || !playerId || playerId === currentPlayer?.id) return false;
    return true;
  };

  return (
    <Card variant="elevated" padding="lg">
      {/* Paused state header - only show if not hidden (GameStatusPanel shows it instead) */}
      {isPaused && !hidePauseHeader && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">Game Paused - Assign Roles</h2>
              <p className="text-sm text-warning mt-1">
                {gameState.pauseReason === "ownerPaused" && (
                  <>Game paused by room owner</>
                )}
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
              <Button
                onClick={onResumeGame}
                disabled={!canResume}
                variant="success"
              >
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface">
              <span className="text-sm font-medium text-muted">Words:</span>
              {isRoomOwner ? (
                <div className="relative" ref={wordPackRef}>
                  <button
                    type="button"
                    onClick={() => setIsWordPackOpen(!isWordPackOpen)}
                    className="px-2 py-1 border border-border rounded-lg bg-surface-elevated text-sm font-medium flex items-center gap-1 w-[160px] hover:border-primary/50 transition-colors"
                  >
                    <span className="truncate flex-1 text-left">
                      {gameState.wordPack.length === 1 
                        ? getPackDisplayName(gameState.wordPack[0])
                        : `${gameState.wordPack.length} packs selected`}
                    </span>
                    <svg 
                      className={`w-4 h-4 text-muted shrink-0 transition-transform ${isWordPackOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isWordPackOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 min-w-[220px]">
                      <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                        {wordPackOptions.map((option) => {
                          const isSelected = gameState.wordPack.includes(option.value);
                          const packWordCount = getWordCount(option.value);
                          const isLastSelected = isSelected && gameState.wordPack.length === 1;
                          return (
                            <label
                              key={option.value}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                                isLastSelected 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'hover:bg-surface'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isLastSelected}
                                onChange={() => {
                                  if (isLastSelected) return;
                                  const newPacks = isSelected
                                    ? gameState.wordPack.filter(p => p !== option.value)
                                    : [...gameState.wordPack, option.value];
                                  onWordPackChange(newPacks);
                                }}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span className="text-sm font-medium flex-1">{option.label}</span>
                              <span className="text-xs text-muted">{packWordCount}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="border-t border-border px-3 py-2 flex justify-between items-center">
                        <span className="text-xs text-muted">
                          Total: {getWordCount(gameState.wordPack)} words
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsWordPackOpen(false)}
                          className="text-xs text-primary hover:text-primary/80 font-medium"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  {gameState.wordPack.length === 1 
                    ? getPackDisplayName(gameState.wordPack[0])
                    : gameState.wordPack.map(p => getPackDisplayName(p)).join(", ")}
                  <span className="text-xs text-muted ml-1">({getWordCount(gameState.wordPack)})</span>
                </span>
              )}
            </div>
            {/* Custom Words */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface">
              <span className="text-sm font-medium text-muted">Custom:</span>
              {isRoomOwner && onCustomWordsChange ? (
                <div className="relative" ref={customWordsRef}>
                  <button
                    type="button"
                    onClick={() => setIsCustomWordsOpen(!isCustomWordsOpen)}
                    className="px-2 py-1 border border-border rounded-lg bg-surface-elevated text-sm font-medium flex items-center gap-1.5 hover:border-muted transition-colors"
                  >
                    <span>{gameState.customWords.length || "0"}</span>
                    <svg 
                      className={`w-4 h-4 text-muted shrink-0 transition-transform ${isCustomWordsOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isCustomWordsOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 w-[320px]">
                      <div className="p-3 space-y-3">
                        {/* Input section */}
                        <div>
                          <label className="block text-xs text-muted mb-1">
                            Add words (comma or newline separated):
                          </label>
                          <textarea
                            value={customWordsInput}
                            onChange={(e) => setCustomWordsInput(e.target.value)}
                            placeholder="pizza, rocket, unicorn..."
                            className="w-full h-16 px-2 py-1.5 text-sm border border-border rounded-lg bg-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomWords}
                            disabled={!customWordsInput.trim()}
                            className="mt-2 w-full px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Add Words
                          </button>
                        </div>
                        
                        {/* Errors */}
                        {customWordsErrors.length > 0 && (
                          <div className="text-xs text-error space-y-0.5">
                            {customWordsErrors.slice(0, 3).map((err, i) => (
                              <p key={i}>{err}</p>
                            ))}
                            {customWordsErrors.length > 3 && (
                              <p>...and {customWordsErrors.length - 3} more</p>
                            )}
                          </div>
                        )}
                        
                        {/* Word chips */}
                        {gameState.customWords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                            {gameState.customWords.map((word) => (
                              <span
                                key={word}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full"
                              >
                                {word}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomWord(word)}
                                  className="hover:text-accent/80"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Footer */}
                      <div className="border-t border-border px-3 py-2 flex justify-between items-center">
                        <span className="text-xs text-muted">
                          {gameState.customWords.length} words (up to {MAX_CUSTOM_WORDS_ON_BOARD} appear)
                        </span>
                        {gameState.customWords.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllCustomWords}
                            className="text-xs text-error hover:text-error/80 font-medium"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  {gameState.customWords.length || "0"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface">
              <span className="text-sm font-medium text-muted">Timer:</span>
              {isRoomOwner ? (
                <div className="relative" ref={timerRef}>
                  <button
                    type="button"
                    onClick={() => setIsTimerOpen(!isTimerOpen)}
                    className="px-2 py-1 border border-border rounded-lg bg-surface-elevated text-sm font-medium flex items-center gap-1 min-w-[100px] hover:border-muted transition-colors"
                  >
                    <span>{TIMER_PRESETS[gameState.timerPreset].label}</span>
                    <svg 
                      className={`w-4 h-4 text-muted shrink-0 transition-transform ${isTimerOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isTimerOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 min-w-[200px]">
                      <div className="p-2 space-y-1">
                        {timerPresetOptions.map((option) => {
                          const isSelected = gameState.timerPreset === option.value;
                          const preset = TIMER_PRESETS[option.value];
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                onTimerPresetChange(option.value);
                                setIsTimerOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded flex items-center justify-between ${
                                isSelected 
                                  ? 'bg-primary/20 text-primary' 
                                  : 'hover:bg-surface'
                              }`}
                            >
                              <div>
                                <div className="text-sm font-medium">{preset.label}</div>
                                <div className="text-xs text-muted">
                                  {preset.clue}s clue / {preset.guess}s guess
                                </div>
                              </div>
                              {isSelected && (
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="border-t border-border px-3 py-2">
                        <p className="text-xs text-muted">
                          First clue gets +{TIMER_PRESETS[gameState.timerPreset].firstClueBonus}s bonus
                        </p>
                      </div>
                    </div>
                  )}
                </div>
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
            {/* Hide Start Game button when game is over (rematch is handled elsewhere) */}
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
              <span className="text-sm text-muted">
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
              className={`rounded-xl border-2 p-4 ${
                team === "red"
                  ? "border-pink-500/60 bg-pink-900/30 shadow-[0_0_20px_rgba(255,51,102,0.2)]"
                  : "border-cyan-500/60 bg-cyan-900/30 shadow-[0_0_20px_rgba(0,212,255,0.2)]"
              }`}
            >
              <h3 className={`text-lg font-pixel mb-3 tracking-wide ${
                team === "red" ? "text-pink-400" : "text-cyan-400"
              }`}>
                {team.toUpperCase()} TEAM
              </h3>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-semibold text-white">Hinter</span>
                </div>
                <p className="text-sm text-purple-300 mb-2 ml-6">Sees all cards • Gives one-word hints</p>
                {clueGiver ? (
                  <div className={`rounded-lg p-3 text-base border ${
                    clueGiver.id === currentPlayer?.id
                      ? "bg-yellow-900/40 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                      : "bg-purple-900/40 border-purple-500/50"
                  }`}>
                    <div className={`font-medium truncate flex items-center gap-2 ${
                      clueGiver.id === currentPlayer?.id ? "text-yellow-300" : "text-white"
                    } ${clueGiverOffline ? "opacity-60" : ""}`}>
                      <span className="text-xl">{clueGiver.avatar}</span>
                      <span>{clueGiver.name}{clueGiver.id === currentPlayer?.id ? " (you)" : ""}</span>
                      {clueGiverOffline && (
                        <span className="text-xs uppercase tracking-wide text-muted">offline</span>
                      )}
                      {clueGiver.id === currentPlayer?.id && showControls && (
                        <button
                          type="button"
                          onClick={() => onSetRole(null, null)}
                          className="ml-auto text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground"
                        >
                          Leave
                        </button>
                      )}
                      {canRemovePlayer(clueGiver.id) && (
                        <button
                          type="button"
                          onClick={() => onSetRole(null, null, clueGiver.id)}
                          className="ml-auto text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground"
                          title="Remove from team"
                        >
                          Remove
                        </button>
                      )}
                      {canKickPlayer(clueGiver.id) && (
                        <button
                          type="button"
                          onClick={() => onKickPlayer!(clueGiver.id)}
                          className={`${canRemovePlayer(clueGiver.id) ? '' : 'ml-auto'} text-xs font-semibold uppercase tracking-wide text-error hover:text-error/80`}
                          title="Kick from room (2 min ban)"
                        >
                          Kick
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
                        ? "border-pink-500/60 text-pink-400 hover:bg-pink-900/30 hover:border-pink-400 hover:shadow-[0_0_15px_rgba(255,51,102,0.3)]"
                        : "border-cyan-500/60 text-cyan-400 hover:bg-cyan-900/30 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                    }`}
                  >
                    Join as Hinter
                  </button>
                ) : (
                  <div className="rounded-lg p-3 text-base border border-border bg-surface">
                    <span className="text-muted">Open</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-semibold text-white">Seekers</span>
                </div>
                <p className="text-sm text-purple-300 mb-2 ml-6">Find words based on hints</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {guessers.map((player) => (
                    <div
                      key={player.id}
                      className={`rounded-lg px-3 py-2 text-base border flex items-center gap-2 ${
                        player.id === currentPlayer?.id
                          ? "bg-yellow-900/40 border-yellow-400 text-yellow-300 font-medium shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                          : "bg-purple-900/40 border-purple-500/50 text-white"
                      } ${player.connected === false ? "opacity-60" : ""}`}
                    >
                      <span className="text-xl">{player.avatar}</span>
                      <span className="truncate">{player.name}{player.id === currentPlayer?.id ? " (you)" : ""}</span>
                      {player.connected === false && (
                        <span className="text-xs uppercase tracking-wide text-muted">offline</span>
                      )}
                      {player.id === currentPlayer?.id && showControls && (
                        <button
                          type="button"
                          onClick={() => onSetRole(null, null)}
                          className="ml-auto text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground"
                        >
                          Leave
                        </button>
                      )}
                      {canRemovePlayer(player.id) && (
                        <button
                          type="button"
                          onClick={() => onSetRole(null, null, player.id)}
                          className="ml-auto text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground"
                          title="Remove from team"
                        >
                          Remove
                        </button>
                      )}
                      {canKickPlayer(player.id) && (
                        <button
                          type="button"
                          onClick={() => onKickPlayer!(player.id)}
                          className={`${canRemovePlayer(player.id) ? '' : 'ml-auto'} text-xs font-semibold uppercase tracking-wide text-error hover:text-error/80`}
                          title="Kick from room (2 min ban)"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  ))}
                  {showControls && !guessers.some(p => p.id === currentPlayer?.id) && (
                    <button
                      onClick={() => onSetRole(team, "guesser")}
                      data-testid={`lobby-join-${team}-guesser`}
                      className={`w-full rounded-lg px-3 py-2 text-base border-2 border-dashed font-medium transition-all ${
                        team === "red"
                          ? "border-pink-500/60 text-pink-400 hover:bg-pink-900/30 hover:border-pink-400 hover:shadow-[0_0_15px_rgba(255,51,102,0.3)]"
                          : "border-cyan-500/60 text-cyan-400 hover:bg-cyan-900/30 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]"
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
          <div className="mt-6 bg-purple-900/40 rounded-xl p-4 border border-purple-500/50">
            <h3 className="text-lg font-pixel text-purple-300 mb-3 tracking-wide">All Players</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  data-testid={`lobby-player-${player.name}`}
                  className={`rounded-lg px-3 py-2 text-base border min-w-0 ${
                  player.id === currentPlayer?.id
                    ? "bg-yellow-900/40 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                    : "bg-purple-900/40 border-purple-500/50"
                } ${player.connected === false ? "opacity-60" : ""}`}>
                  <div className={`font-medium flex items-center gap-2 ${
                    player.id === currentPlayer?.id ? "text-yellow-300" : "text-white"
                  }`}>
                    <span className="text-2xl">{player.avatar}</span>
                    <span className="truncate">{player.name}{player.id === currentPlayer?.id ? " (you)" : ""}</span>
                    {player.connected === false && (
                      <span className="text-xs uppercase tracking-wide text-muted">offline</span>
                    )}
                    {canRemovePlayer(player.id) && player.team && player.role && (
                      <button
                        type="button"
                        onClick={() => onSetRole(null, null, player.id)}
                        className="ml-auto text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground"
                        title="Remove from team"
                      >
                        Remove
                      </button>
                    )}
                    {canKickPlayer(player.id) && (
                      <button
                        type="button"
                        onClick={() => onKickPlayer!(player.id)}
                        className={`${canRemovePlayer(player.id) && player.team && player.role ? '' : 'ml-auto'} text-xs font-semibold uppercase tracking-wide text-error hover:text-error/80`}
                        title="Kick from room (2 min ban)"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                  {player.team && player.role && (
                    <div className={`text-sm mt-1 ml-9 ${
                      player.team === "red" ? "text-pink-400" : "text-cyan-400"
                    }`}>
                      {player.team} {player.role === "clueGiver" ? "hinter" : "seeker"}
                    </div>
                  )}
                  {!player.team || !player.role ? (
                    <div className="text-sm text-purple-400 mt-1 ml-9">
                      {isPaused ? "Spectator" : "No team selected"}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          {!isPaused && players.filter(p => p.team && p.role).length < 4 && (
            <p className="text-sm text-muted mt-3">
              Waiting for {4 - players.filter(p => p.team && p.role).length} more player{4 - players.filter(p => p.team && p.role).length !== 1 ? "s" : ""} to join teams...
            </p>
          )}
        </>
      )}
    </Card>
  );
}
