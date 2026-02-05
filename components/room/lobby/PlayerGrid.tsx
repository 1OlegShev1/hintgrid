import type { Player } from "@/shared/types";

interface PlayerGridProps {
  players: Player[];
  currentPlayer: Player | null;
  isRoomOwner: boolean;
  isPaused: boolean;
  isTeamManagementAllowed: boolean;
  onSetRole: (team: "red" | "blue" | null, role: "clueGiver" | "guesser" | null, targetPlayerId?: string) => void;
  onKickPlayer?: (playerId: string) => void;
}

export function PlayerGrid({
  players,
  currentPlayer,
  isRoomOwner,
  isPaused,
  isTeamManagementAllowed,
  onSetRole,
  onKickPlayer,
}: PlayerGridProps) {
  const canRemovePlayer = (playerId?: string) => {
    if (!isRoomOwner || !playerId || playerId === currentPlayer?.id) return false;
    return isTeamManagementAllowed;
  };

  const canKick = (playerId?: string) => {
    if (!isRoomOwner || !onKickPlayer || !playerId || playerId === currentPlayer?.id) return false;
    return true;
  };

  return (
    <div className="mt-6 bg-surface rounded-xl p-4 border border-border">
      <h3 className="text-lg font-pixel text-accent mb-3 tracking-wide">All Players</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {players.map((player) => {
          const showRemove = canRemovePlayer(player.id) && player.team && player.role;
          const showKick = canKick(player.id);
          const hasActions = showRemove || showKick;

          return (
            <div
              key={player.id}
              data-testid={`lobby-player-${player.name}`}
              className={`rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base border min-w-0 ${
                player.id === currentPlayer?.id
                  ? "bg-highlight border-highlight-text"
                  : "bg-surface-elevated border-border"
              } ${player.connected === false ? "opacity-60" : ""}`}
            >
              {/* Row 1: Avatar + Name */}
              <div
                className={`font-medium flex items-center gap-1.5 sm:gap-2 ${
                  player.id === currentPlayer?.id ? "text-highlight-text" : "text-foreground"
                }`}
              >
                <span className="text-lg sm:text-2xl shrink-0">{player.avatar}</span>
                <span className="truncate text-sm sm:text-base">
                  {player.name}
                  {player.id === currentPlayer?.id ? " (you)" : ""}
                </span>
                {player.connected === false && (
                  <span className="text-[10px] sm:text-xs uppercase tracking-wide text-muted shrink-0">
                    off
                  </span>
                )}
              </div>
              {/* Row 2: Role */}
              {player.team && player.role && (
                <div
                  className={`text-xs sm:text-sm mt-1 ml-6 sm:ml-9 ${
                    player.team === "red" ? "text-red-team" : "text-blue-team"
                  }`}
                >
                  {player.team} {player.role === "clueGiver" ? "hinter" : "seeker"}
                </div>
              )}
              {!player.team || !player.role ? (
                <div className="text-xs sm:text-sm text-muted mt-1 ml-6 sm:ml-9">
                  {isPaused ? "Spectator" : "No team"}
                </div>
              ) : null}
              {/* Row 3: Action buttons (if any) */}
              {hasActions && (
                <div className="flex items-center gap-2 mt-1.5 ml-6 sm:ml-9">
                  {showRemove && (
                    <button
                      type="button"
                      onClick={() => onSetRole(null, null, player.id)}
                      className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground"
                      title="Remove from team"
                    >
                      Remove
                    </button>
                  )}
                  {showKick && (
                    <button
                      type="button"
                      onClick={() => onKickPlayer!(player.id)}
                      className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-error hover:text-error/80"
                      title="Kick from room (2 min ban)"
                    >
                      Kick
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
