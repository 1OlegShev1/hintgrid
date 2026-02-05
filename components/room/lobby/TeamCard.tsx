import { Eye, Users } from "lucide-react";
import type { Player } from "@/shared/types";

interface TeamCardProps {
  team: "red" | "blue";
  clueGiver: Player | undefined;
  guessers: Player[];
  currentPlayer: Player | null;
  showControls: boolean;
  isTeamManagementAllowed: boolean;
  isRoomOwner: boolean;
  onSetRole: (team: "red" | "blue" | null, role: "clueGiver" | "guesser" | null, targetPlayerId?: string) => void;
  onKickPlayer?: (playerId: string) => void;
}

export function TeamCard({
  team,
  clueGiver,
  guessers,
  currentPlayer,
  showControls,
  isTeamManagementAllowed,
  isRoomOwner,
  onSetRole,
  onKickPlayer,
}: TeamCardProps) {
  const clueGiverOffline = clueGiver?.connected === false;

  const canRemovePlayer = (playerId?: string) => {
    if (!isRoomOwner || !playerId || playerId === currentPlayer?.id) return false;
    return isTeamManagementAllowed;
  };

  const canKick = (playerId?: string) => {
    if (!isRoomOwner || !onKickPlayer || !playerId || playerId === currentPlayer?.id) return false;
    return true;
  };

  return (
    <div
      className={`rounded-xl border-2 p-4 ${
        team === "red"
          ? "border-red-team/60 bg-red-team-light"
          : "border-blue-team/60 bg-blue-team-light"
      }`}
    >
      <h3
        className={`text-lg font-pixel mb-3 tracking-wide ${
          team === "red" ? "text-red-team" : "text-blue-team"
        }`}
      >
        {team.toUpperCase()} TEAM
      </h3>

      {/* Hinter section */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-4 h-4 text-muted" />
          <span className="font-semibold text-foreground">Hinter</span>
        </div>
        <p className="text-sm text-muted mb-2 ml-6">Sees all cards &bull; Gives one-word hints</p>
        {clueGiver ? (
          <div
            className={`rounded-lg p-3 text-base border ${
              clueGiver.id === currentPlayer?.id
                ? "bg-highlight border-highlight-text"
                : "bg-surface border-border"
            }`}
          >
            <div
              className={`font-medium truncate flex items-center gap-2 ${
                clueGiver.id === currentPlayer?.id ? "text-highlight-text" : "text-foreground"
              } ${clueGiverOffline ? "opacity-60" : ""}`}
            >
              <span className="text-xl">{clueGiver.avatar}</span>
              <span>
                {clueGiver.name}
                {clueGiver.id === currentPlayer?.id ? " (you)" : ""}
              </span>
              {clueGiverOffline && (
                <span className="text-xs uppercase tracking-wide text-muted">offline</span>
              )}
              {clueGiver.id === currentPlayer?.id && showControls && (
                <button
                  type="button"
                  data-testid="lobby-leave-team-btn"
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
              {canKick(clueGiver.id) && (
                <button
                  type="button"
                  onClick={() => onKickPlayer!(clueGiver.id)}
                  className={`${canRemovePlayer(clueGiver.id) ? "" : "ml-auto"} text-xs font-semibold uppercase tracking-wide text-error hover:text-error/80`}
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
                ? "border-red-team/60 text-red-team hover:bg-red-team-light hover:border-red-team"
                : "border-blue-team/60 text-blue-team hover:bg-blue-team-light hover:border-blue-team"
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

      {/* Seekers section */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-muted" />
          <span className="font-semibold text-foreground">Seekers</span>
        </div>
        <p className="text-sm text-muted mb-2 ml-6">Find words based on hints</p>
        <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
          {guessers.map((player) => (
            <div
              key={player.id}
              className={`rounded-lg px-3 py-2 text-base border flex items-center gap-2 ${
                player.id === currentPlayer?.id
                  ? "bg-highlight border-highlight-text text-highlight-text font-medium"
                  : "bg-surface border-border text-foreground"
              } ${player.connected === false ? "opacity-60" : ""}`}
            >
              <span className="text-xl">{player.avatar}</span>
              <span className="truncate">
                {player.name}
                {player.id === currentPlayer?.id ? " (you)" : ""}
              </span>
              {player.connected === false && (
                <span className="text-xs uppercase tracking-wide text-muted">offline</span>
              )}
              {player.id === currentPlayer?.id && showControls && (
                <button
                  type="button"
                  data-testid="lobby-leave-team-btn"
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
              {canKick(player.id) && (
                <button
                  type="button"
                  onClick={() => onKickPlayer!(player.id)}
                  className={`${canRemovePlayer(player.id) ? "" : "ml-auto"} text-xs font-semibold uppercase tracking-wide text-error hover:text-error/80`}
                  title="Kick from room (2 min ban)"
                >
                  Kick
                </button>
              )}
            </div>
          ))}
          {showControls && !guessers.some((p) => p.id === currentPlayer?.id) && (
            <button
              onClick={() => onSetRole(team, "guesser")}
              data-testid={`lobby-join-${team}-guesser`}
              className={`w-full rounded-lg px-3 py-2 text-base border-2 border-dashed font-medium transition-all ${
                team === "red"
                  ? "border-red-team/60 text-red-team hover:bg-red-team-light hover:border-red-team"
                  : "border-blue-team/60 text-blue-team hover:bg-blue-team-light hover:border-blue-team"
              }`}
            >
              Join as Seeker
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
