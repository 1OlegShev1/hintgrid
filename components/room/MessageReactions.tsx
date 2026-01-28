"use client";

import { useState, useRef, useEffect } from "react";
import { REACTION_EMOJIS } from "@/shared/constants";
import type { Player } from "@/shared/types";

interface MessageReactionsProps {
  messageId: string;
  reactions?: Record<string, string[]>;
  currentPlayerId: string | null;
  players: Player[];
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

export function MessageReactions({
  messageId,
  reactions,
  currentPlayerId,
  players,
  onAddReaction,
  onRemoveReaction,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPicker]);

  // Helper to get player name by ID
  const getPlayerName = (playerId: string): string => {
    const player = players.find((p) => p.id === playerId);
    return player?.name || "Unknown";
  };

  // Check if current player has reacted with this emoji
  const hasReacted = (emoji: string): boolean => {
    if (!currentPlayerId || !reactions?.[emoji]) return false;
    return reactions[emoji].includes(currentPlayerId);
  };

  // Handle clicking an existing reaction (toggle)
  const handleReactionClick = (emoji: string) => {
    if (!currentPlayerId) return;
    if (hasReacted(emoji)) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  // Handle adding a new reaction from the picker
  const handlePickerSelect = (emoji: string) => {
    if (!currentPlayerId) return;
    onAddReaction(messageId, emoji);
    setShowPicker(false);
  };

  // Get sorted reactions (by count, descending)
  const sortedReactions = reactions
    ? Object.entries(reactions)
        .filter(([, playerIds]) => playerIds.length > 0)
        .sort((a, b) => b[1].length - a[1].length)
    : [];

  // Build tooltip with player names
  const getTooltip = (emoji: string, playerIds: string[]): string => {
    const names = playerIds.map(getPlayerName);
    if (names.length <= 3) {
      return names.join(", ");
    }
    return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-0.5">
      {/* Existing reactions */}
      {sortedReactions.map(([emoji, playerIds]) => (
        <button
          key={emoji}
          onClick={() => handleReactionClick(emoji)}
          disabled={!currentPlayerId}
          title={getTooltip(emoji, playerIds)}
          className={`
            inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs
            transition-colors cursor-pointer
            ${
              hasReacted(emoji)
                ? "bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700"
                : "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
            }
            disabled:cursor-not-allowed disabled:opacity-50
          `}
        >
          <span>{emoji}</span>
          <span className="text-gray-600 dark:text-gray-400 font-medium">{playerIds.length}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div ref={pickerRef} className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          disabled={!currentPlayerId}
          title="Add reaction"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" />
          </svg>
        </button>

        {/* Reaction picker popup */}
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="grid grid-cols-5 gap-1" style={{ width: "180px" }}>
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handlePickerSelect(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
