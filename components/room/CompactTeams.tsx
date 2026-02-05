import type { Player } from "@/shared/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getTeamClasses, getTeamTextClass } from "@/components/ui/TeamIndicator";

interface CompactTeamsProps {
  players: Player[];
  currentPlayerId?: string | null;
  isRoomOwner?: boolean;
  onAddSpectator?: (team: "red" | "blue", playerId: string) => void;
  onKickPlayer?: (playerId: string) => void;
}

export default function CompactTeams({ players, currentPlayerId, isRoomOwner, onAddSpectator, onKickPlayer }: CompactTeamsProps) {
  // Spectators are players without a team or role
  const spectators = players.filter((p) => !p.team || !p.role);

  return (
    <Card className="mt-4" variant="elevated">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-muted">Teams</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              className={`${getTeamClasses(team, "card")} p-2.5 sm:p-3`}
            >
              <div className={`text-sm font-bold uppercase mb-2 ${getTeamTextClass(team)}`}>
                {team} Team
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {clueGiver ? (
                    <>
                      <span className="text-lg">{clueGiver.avatar}</span>
                      <span className={`font-medium truncate ${
                        clueGiver.id === currentPlayerId 
                          ? "text-highlight-text" 
                          : "text-foreground"
                      } ${clueGiverOffline ? "opacity-60" : ""}`}>
                        {clueGiver.name}{clueGiver.id === currentPlayerId ? " (you)" : ""}
                      </span>
                      {clueGiverOffline && (
                        <span className="text-[10px] uppercase tracking-wide text-muted">offline</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>
                <div className="flex items-start gap-2 text-sm text-muted">
                  <svg className="w-4 h-4 shrink-0 mt-0.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {guessers.length === 0 ? (
                      <span>—</span>
                    ) : (
                      guessers.map((p, i) => (
                        <span key={p.id} className={`whitespace-nowrap ${
                          p.id === currentPlayerId 
                            ? "text-highlight-text font-medium" 
                            : ""
                      } ${p.connected === false ? "opacity-60" : ""}`}>
                          <span className="text-base">{p.avatar}</span> {p.name}{p.id === currentPlayerId ? " (you)" : ""}{i < guessers.length - 1 ? "," : ""}
                        {p.connected === false && (
                          <span className="ml-1 text-[10px] uppercase tracking-wide text-muted">offline</span>
                        )}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Spectators section */}
      {spectators.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Spectators ({spectators.length})</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {spectators.map((p) => {
              const isMe = p.id === currentPlayerId;
              const isOffline = p.connected === false;
              return (
                <div
                  key={p.id}
                  className={`text-sm px-3 py-2 rounded-lg ${
                    isMe
                      ? "bg-highlight text-highlight-text"
                      : "bg-surface text-foreground"
                  } ${isOffline ? "opacity-60" : ""}`}
                >
                  <div className={`font-medium flex items-center gap-2 ${isRoomOwner && onAddSpectator ? "mb-2" : ""}`}>
                    <span className="text-lg">{p.avatar}</span>
                    <span>{p.name}{isMe ? " (you)" : ""}</span>
                    {isOffline && (
                      <span className="text-[10px] uppercase tracking-wide text-muted">offline</span>
                    )}
                  </div>
                  {isRoomOwner && (onAddSpectator || onKickPlayer) && (
                    <div className="flex gap-2 flex-wrap">
                      {onAddSpectator && (
                        <>
                          <Button
                            onClick={() => onAddSpectator("red", p.id)}
                            variant="red"
                            size="sm"
                            className="text-xs py-1"
                          >
                            Join Red
                          </Button>
                          <Button
                            onClick={() => onAddSpectator("blue", p.id)}
                            variant="blue"
                            size="sm"
                            className="text-xs py-1"
                          >
                            Join Blue
                          </Button>
                        </>
                      )}
                      {onKickPlayer && !isMe && (
                        <Button
                          onClick={() => onKickPlayer(p.id)}
                          variant="ghost"
                          size="sm"
                          className="text-xs py-1 text-error hover:text-error"
                          title="Kick from room (2 min ban)"
                        >
                          Kick
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
