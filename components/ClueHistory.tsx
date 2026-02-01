"use client";

import type { ChatMessage } from "@/shared/types";

interface ClueHistoryProps {
  clues: ChatMessage[];
}

export default function ClueHistory({ clues }: ClueHistoryProps) {
  // Show clues, card reveals, and game-related system messages
  const gameMessages = clues.filter(
    (msg) => msg.type === "clue" || msg.type === "reveal" || msg.type === "game-system"
  );

  // Get team styling for clues
  const getClueTeamClasses = (team?: string) => {
    if (team === "red") {
      return {
        container: "bg-red-team-light border-l-4 border-red-team",
        badge: "bg-red-team text-white",
        text: "text-red-team-text",
        clue: "text-red-team",
      };
    }
    return {
      container: "bg-blue-team-light border-l-4 border-blue-team",
      badge: "bg-blue-team text-white",
      text: "text-blue-team-text",
      clue: "text-blue-team",
    };
  };

  // Get team styling for reveals (based on what card was revealed)
  const getRevealClasses = (team?: string) => {
    switch (team) {
      case "red":
        return "bg-red-team-light text-red-team-text";
      case "blue":
        return "bg-blue-team-light text-blue-team-text";
      case "trap":
        return "bg-trap text-trap-text";
      case "neutral":
        return "bg-neutral-card/30 text-neutral-card-text";
      default:
        return "bg-surface text-foreground";
    }
  };

  return (
    <div className="bg-surface rounded-lg flex-1 min-h-0 flex flex-col">
      <h3 className="font-semibold px-4 py-3 border-b border-border shrink-0 text-foreground">
        Game Log
      </h3>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {gameMessages.length === 0 ? (
          <p className="text-muted text-sm px-1">No activity yet</p>
        ) : (
          gameMessages.map((msg) => (
            <div key={msg.id}>
              {msg.type === "clue" ? (
                // Clue message - compact single line with team color
                (() => {
                  const styles = getClueTeamClasses(msg.clueTeam);
                  return (
                    <div className={`rounded-r-lg px-3 py-1.5 text-sm ${styles.container}`}>
                      <div className="flex items-center gap-2">
                        <span>{msg.playerAvatar || "🎯"}</span>
                        <span className={`font-medium ${styles.text}`}>{msg.playerName}</span>
                        <span className={`font-bold ${styles.clue}`}>{msg.message}</span>
                        <span className="ml-auto text-[10px] opacity-50">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })()
              ) : msg.type === "reveal" ? (
                // Reveal message - indented under clue, colored by card team
                <div className={`ml-3 rounded-lg px-3 py-1.5 text-sm ${getRevealClasses(msg.revealedTeam)}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{msg.playerAvatar || "👆"}</span>
                    <span className="font-medium">{msg.playerName}</span>
                    <span className="opacity-75">found</span>
                    <span className="font-bold">{msg.message}</span>
                    <span className="ml-auto text-[10px] opacity-50">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ) : (
                // Game system message (paused, resumed, ended)
                <div className="text-center text-xs text-muted py-1 italic">
                  — {msg.message} —
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
