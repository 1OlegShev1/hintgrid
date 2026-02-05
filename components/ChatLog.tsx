"use client";

import { useRef, useEffect, useState } from "react";
import type { ChatMessage, Player } from "@/shared/types";
import { MessageReactions } from "@/components/room";
import { Card } from "@/components/ui";

interface ChatLogProps {
  messages: ChatMessage[];
  players?: Player[];
  currentPlayerId?: string | null;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
}

export default function ChatLog({
  messages,
  players = [],
  currentPlayerId = null,
  onAddReaction,
  onRemoveReaction,
}: ChatLogProps) {
  // Show chat and user-related system messages (not game-system)
  // User system messages: offline, joined team, spectator, owner transfer
  const chatMessages = messages.filter((msg) => msg.type === "chat" || msg.type === "system");
  
  // Auto-scroll state and ref
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Scroll to bottom when new messages arrive (if autoScroll is on)
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages.length, autoScroll]);

  // Helper to get avatar by playerId
  const getAvatar = (playerId?: string) => {
    if (!playerId) return null;
    const player = players.find((p) => p.id === playerId);
    return player?.avatar || null;
  };

  // Check if reactions are enabled (handlers provided)
  const reactionsEnabled = !!onAddReaction && !!onRemoveReaction;

  return (
    <div className="bg-surface rounded-lg flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="font-semibold text-foreground">Chat</h3>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            autoScroll 
              ? "bg-primary/20 text-primary" 
              : "bg-muted/20 text-muted hover:text-foreground"
          }`}
          title={autoScroll ? "Auto-scroll enabled" : "Auto-scroll disabled"}
        >
          {autoScroll ? "⬇ Auto" : "⬇ Manual"}
        </button>
      </div>
      <div ref={scrollRef} aria-live="polite" aria-relevant="additions" className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 space-y-2 font-mono text-sm">
        {chatMessages.length === 0 ? (
          <p className="text-muted text-sm font-sans px-1">No messages yet</p>
        ) : (
          chatMessages.map((msg) => {
            const avatar = getAvatar(msg.playerId);
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            
            return (
              <div key={msg.id} className="leading-relaxed">
                {msg.type === "system" ? (
                  // System message - IRC style with asterisk
                  <div className="text-muted">
                    <span className="text-muted/70 text-xs">[{time}]</span>{" "}
                    <span className="text-warning">*</span>{" "}
                    <span className="italic">{msg.message}</span>
                  </div>
                ) : (
                  // Chat message - IRC style with brackets
                  <div className="group">
                    <div className="text-foreground">
                      <span className="text-muted/70 text-xs">[{time}]</span>{" "}
                      {avatar && <span className="not-italic">{avatar}</span>}
                      <span className="text-accent font-semibold">
                        &lt;{msg.playerName}&gt;
                      </span>{" "}
                      <span className="font-sans">{msg.message}</span>
                    </div>
                    {/* Reactions row for chat messages only */}
                    {reactionsEnabled && (
                      <div>
                        <MessageReactions
                          messageId={msg.id}
                          reactions={msg.reactions}
                          currentPlayerId={currentPlayerId}
                          players={players}
                          onAddReaction={onAddReaction}
                          onRemoveReaction={onRemoveReaction}
                        />
                      </div>
                    )}
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
