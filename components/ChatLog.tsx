"use client";

import type { ChatMessage, Player } from "@/shared/types";

interface ChatLogProps {
  messages: ChatMessage[];
  players?: Player[];
}

export default function ChatLog({ messages, players = [] }: ChatLogProps) {
  // Show both chat and system messages (IRC-style)
  const chatMessages = messages.filter((msg) => msg.type === "chat" || msg.type === "system");

  // Helper to get avatar by playerId
  const getAvatar = (playerId?: string) => {
    if (!playerId) return null;
    const player = players.find((p) => p.id === playerId);
    return player?.avatar || null;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg h-64 flex flex-col">
      <h3 className="font-semibold px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        Chat
      </h3>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1 font-mono text-sm">
        {chatMessages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm font-sans px-1">No messages yet</p>
        ) : (
          chatMessages.map((msg) => {
            const avatar = getAvatar(msg.playerId);
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            
            return (
              <div key={msg.id} className="leading-relaxed">
                {msg.type === "system" ? (
                  // System message - IRC style with asterisk
                  <div className="text-gray-500 dark:text-gray-400">
                    <span className="text-gray-400 dark:text-gray-500 text-xs">[{time}]</span>{" "}
                    <span className="text-amber-600 dark:text-amber-400">*</span>{" "}
                    <span className="italic">{msg.message}</span>
                  </div>
                ) : (
                  // Chat message - IRC style with brackets
                  <div className="text-gray-800 dark:text-gray-200">
                    <span className="text-gray-400 dark:text-gray-500 text-xs">[{time}]</span>{" "}
                    {avatar && <span className="not-italic">{avatar}</span>}
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">
                      &lt;{msg.playerName}&gt;
                    </span>{" "}
                    <span className="font-sans">{msg.message}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
