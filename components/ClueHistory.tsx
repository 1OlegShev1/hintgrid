"use client";

import type { ChatMessage } from "@/shared/types";

interface ClueHistoryProps {
  clues: ChatMessage[];
}

export default function ClueHistory({ clues }: ClueHistoryProps) {
  // Show clues and card reveals
  const gameMessages = clues.filter((msg) => msg.type === "clue" || msg.type === "reveal");

  // Get team color classes
  const getTeamColorClasses = (team?: string) => {
    switch (team) {
      case "red":
        return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700";
      case "blue":
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700";
      case "trap":
        return "bg-gray-800 dark:bg-gray-900 text-white border-gray-600";
      case "neutral":
        return "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700";
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg h-48 flex flex-col">
      <h3 className="font-semibold px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        Game Log
      </h3>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {gameMessages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm px-1">No clues yet</p>
        ) : (
          gameMessages.map((msg) => (
            <div key={msg.id}>
              {msg.type === "clue" ? (
                // Clue message - prominent display
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <span className="text-lg shrink-0">{msg.playerAvatar || "🎯"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium text-amber-900 dark:text-amber-100 text-sm">
                        {msg.playerName}
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400">gave clue</span>
                    </div>
                    <div className="font-bold text-amber-800 dark:text-amber-200 text-lg mt-0.5">
                      {msg.message}
                    </div>
                  </div>
                  <span className="text-gray-400 text-[10px] shrink-0">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ) : (
                // Reveal message - shows which card was revealed
                <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border text-sm ${getTeamColorClasses(msg.revealedTeam)}`}>
                  <span className="shrink-0">{msg.playerAvatar || "👆"}</span>
                  <span className="font-medium truncate">{msg.playerName}</span>
                  <span className="text-xs opacity-75">revealed</span>
                  <span className="font-bold">{msg.message}</span>
                  <span className="ml-auto text-[10px] opacity-60 shrink-0">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
