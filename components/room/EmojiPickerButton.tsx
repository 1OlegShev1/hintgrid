"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import { useTheme } from "@/components/ThemeProvider";

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPickerButton({ onEmojiSelect, disabled }: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // Calculate picker position when opening
  const openPicker = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position above the button, aligned to the right edge
      setPickerPosition({
        top: rect.top - 8, // 8px gap above button
        left: Math.max(8, rect.right - 320), // Align right edge, but keep 8px from screen edge
      });
    }
    setIsOpen(true);
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
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
        disabled={disabled}
        className="p-2.5 text-muted hover:text-foreground hover:bg-surface active:bg-surface-elevated rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Open emoji picker"
        title="Add emoji"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>

      {/* Fixed position picker to escape overflow containers */}
      {isOpen && (
        <div
          ref={pickerRef}
          className="fixed z-50"
          style={{
            top: pickerPosition.top,
            left: pickerPosition.left,
            transform: "translateY(-100%)",
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
            width={320}
            height={400}
            searchPlaceholder="Search emoji..."
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
            lazyLoadEmojis
          />
        </div>
      )}
    </>
  );
}
