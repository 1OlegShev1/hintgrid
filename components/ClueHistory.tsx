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
        container: "bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500",
        badge: "bg-red-500 text-white",
        text: "text-red-900 dark:text-red-100",
        clue: "text-red-800 dark:text-red-200",
      };
    }
    return {
      container: "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500",
      badge: "bg-blue-500 text-white",
      text: "text-blue-900 dark:text-blue-100",
      clue: "text-blue-800 dark:text-blue-200",
    };
  };

  // Get team styling for reveals (based on what card was revealed)
  const getRevealClasses = (team?: string) => {
    switch (team) {
      case "red":
        return "bg-red-200 dark:bg-red-800/60 text-red-800 dark:text-red-100";
      case "blue":
        return "bg-blue-200 dark:bg-blue-800/60 text-blue-800 dark:text-blue-100";
      case "trap":
        return "bg-gray-900 dark:bg-black text-white";
      case "neutral":
        return "bg-amber-200 dark:bg-amber-800/60 text-amber-800 dark:text-amber-100";
      default:
        return "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
    }
  };

  const getRevealLabel = (team?: string) => {
    switch (team) {
      case "red": return "RED";
      case "blue": return "BLUE";
      case "trap": return "TRAP";
      case "neutral": return "NEUTRAL";
      default: return "";
    }
  };

  // Get badge styling for reveal result
  const getRevealBadgeClasses = (team?: string) => {
    switch (team) {
      case "red":
        return "bg-red-500 text-white";
      case "blue":
        return "bg-blue-500 text-white";
      case "trap":
        return "bg-gray-900 text-white";
      case "neutral":
        return "bg-amber-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg h-full min-h-48 flex flex-col">
      <h3 className="font-semibold px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        Game Log
      </h3>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {gameMessages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm px-1">No activity yet</p>
        ) : (
          gameMessages.map((msg) => (
            <div key={msg.id}>
              {msg.type === "clue" ? (
                // Clue message - team colored with left border
                (() => {
                  const styles = getClueTeamClasses(msg.clueTeam);
                  return (
                    <div className={`rounded-r-lg px-3 py-2 ${styles.container}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${styles.badge}`}>
                          {msg.clueTeam || "?"} hint
                        </span>
                        <span className="text-lg">{msg.playerAvatar || "🎯"}</span>
                        <span className={`font-medium text-sm ${styles.text}`}>{msg.playerName}</span>
                        <span className="ml-auto text-gray-400 text-[10px]">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className={`font-bold text-lg ${styles.clue}`}>
                        {msg.message}
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
                <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-1 italic">
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
