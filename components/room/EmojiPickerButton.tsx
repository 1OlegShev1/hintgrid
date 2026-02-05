"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import { useTheme } from "@/components/ThemeProvider";

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  /** Reference to chat input - used to refocus after emoji selection */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function EmojiPickerButton({ onEmojiSelect, disabled, inputRef }: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0, width: 320 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // Calculate picker position - accounts for visual viewport (keyboard may be open or closed)
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return null;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const pickerWidth = Math.min(320, viewportWidth - 16);
    
    // Use visualViewport for accurate positioning with keyboard
    const visualViewport = window.visualViewport;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportOffsetTop = visualViewport?.offsetTop ?? 0;
    
    const pickerHeight = 350;
    
    // Try to position above the button
    let top = rect.top - 8;
    
    // If not enough space above, check if there's space below
    if (top - pickerHeight < viewportOffsetTop + 8) {
      // Not enough space above, position below the button if possible
      const spaceBelow = viewportHeight - rect.bottom;
      if (spaceBelow > pickerHeight + 16) {
        // Position below
        top = rect.bottom + 8 + pickerHeight;
      } else {
        // Not enough space below either, position at top of viewport
        top = viewportOffsetTop + pickerHeight + 16;
      }
    }
    
    // Keep within horizontal bounds
    let left = rect.right - pickerWidth;
    if (left < 8) left = 8;
    if (left + pickerWidth > viewportWidth - 8) left = viewportWidth - pickerWidth - 8;
    
    return { top, left, width: pickerWidth };
  }, []);

  // Open picker
  const openPicker = useCallback(() => {
    const position = calculatePosition();
    if (position) {
      setPickerPosition(position);
    }
    setIsOpen(true);
  }, [calculatePosition]);
  
  // Prevent button from stealing focus (keeps keyboard open on mobile)
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  }, []);
  
  // Handle button click - toggle picker
  const handleClick = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      // Refocus input when closing picker
      inputRef?.current?.focus();
    } else {
      // Focus input first to open keyboard, then open picker
      inputRef?.current?.focus();
      openPicker();
    }
  }, [isOpen, openPicker, inputRef]);

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
  
  // Reposition picker when visual viewport changes (keyboard open/close)
  useEffect(() => {
    if (!isOpen) return;
    
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;
    
    const handleResize = () => {
      const position = calculatePosition();
      if (position) {
        setPickerPosition(position);
      }
    };
    
    visualViewport.addEventListener("resize", handleResize);
    visualViewport.addEventListener("scroll", handleResize);
    
    return () => {
      visualViewport.removeEventListener("resize", handleResize);
      visualViewport.removeEventListener("scroll", handleResize);
    };
  }, [isOpen, calculatePosition]);

  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
    // Refocus input after selecting emoji to reopen keyboard
    setTimeout(() => {
      inputRef?.current?.focus();
    }, 50);
  }, [onEmojiSelect, inputRef]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
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

      {/* Fixed position picker */}
      {isOpen && (
        <div
          ref={pickerRef}
          className="fixed z-50"
          style={{
            top: pickerPosition.top,
            left: pickerPosition.left,
            transform: "translateY(-100%)",
          }}
          onMouseDown={(e) => e.preventDefault()}
          onTouchEnd={() => {
            // Refocus input after touch interaction to keep keyboard open
            inputRef?.current?.focus();
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
            width={pickerPosition.width}
            height={350}
            searchPlaceholder="Search emoji..."
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
            lazyLoadEmojis
            autoFocusSearch={false}
          />
        </div>
      )}
    </>
  );
}
