"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Smile } from "lucide-react";
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
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Calculate picker position when opening
  const openPicker = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const pickerWidth = 200;
      
      // Position above the button, but ensure it stays within viewport
      let left = rect.left;
      if (left + pickerWidth > viewportWidth - 8) {
        left = viewportWidth - pickerWidth - 8;
      }
      if (left < 8) left = 8;
      
      setPickerPosition({
        top: rect.top - 8,
        left: left,
      });
    }
    setShowPicker(true);
  }, []);

  // Close picker when clicking/touching outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    }

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
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
      {/* Add reaction button - at the start of the row */}
      <button
        ref={buttonRef}
        onClick={() => (showPicker ? setShowPicker(false) : openPicker())}
        disabled={!currentPlayerId}
        title="Add reaction"
        className="inline-flex items-center justify-center w-6 h-6 rounded text-muted hover:text-foreground hover:bg-surface transition-colors disabled:cursor-not-allowed disabled:opacity-50 opacity-60 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
      >
        <Smile className="w-3.5 h-3.5" />
      </button>

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
                ? "bg-primary/20 border border-primary/50"
                : "bg-surface border border-border hover:bg-surface-elevated"
            }
            disabled:cursor-not-allowed disabled:opacity-50
          `}
        >
          <span>{emoji}</span>
          <span className="text-muted font-medium">{playerIds.length}</span>
        </button>
      ))}

      {/* Reaction picker popup - fixed position to escape overflow container */}
      {showPicker && (
        <div
          ref={pickerRef}
          className="fixed p-2 bg-surface-elevated rounded-lg shadow-lg border border-border z-50 touch-none overscroll-contain"
          style={{
            top: pickerPosition.top,
            left: pickerPosition.left,
            transform: "translateY(-100%)",
          }}
        >
          <div className="grid grid-cols-5 gap-1">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handlePickerSelect(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-surface active:bg-surface-elevated rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
