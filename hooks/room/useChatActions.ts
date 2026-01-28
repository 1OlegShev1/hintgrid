/**
 * Chat actions hook - handles chat functionality.
 */

import { useState, useCallback, useRef } from "react";
import * as actions from "@/lib/rtdb-actions";
import { useError } from "@/contexts/ErrorContext";
import { withRetry, isRetryableError } from "@/lib/retry";
import { sanitizeChatMessageWithCensor } from "@/shared/validation";

export interface UseChatActionsReturn {
  chatInput: string;
  setChatInput: (value: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  isSending: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleEmojiSelect: (emoji: string) => void;
  handleAddReaction: (messageId: string, emoji: string) => void;
  handleRemoveReaction: (messageId: string, emoji: string) => void;
}

export function useChatActions(
  roomCode: string,
  uid: string | null
): UseChatActionsReturn {
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { showError } = useError();

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !uid || isSending) return;

    // Censor profanity in chat messages
    const messageToSend = sanitizeChatMessageWithCensor(chatInput);
    if (!messageToSend) return;
    
    setIsSending(true);
    
    // Clear input optimistically for better UX
    setChatInput("");
    
    withRetry(
      () => actions.sendMessage(roomCode, uid, messageToSend, "chat"),
      { 
        maxAttempts: 2, 
        initialDelayMs: 500,
        shouldRetry: isRetryableError 
      }
    )
      .catch((error) => {
        // Restore input on failure
        setChatInput(messageToSend);
        showError(error.message || "Failed to send message");
        console.error("[Chat] Failed to send message:", error);
      })
      .finally(() => {
        setIsSending(false);
      });
  }, [roomCode, chatInput, uid, isSending, showError]);

  // Insert emoji at cursor position in chat input
  const handleEmojiSelect = useCallback((emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setChatInput((prev) => prev + emoji);
      return;
    }

    const start = input.selectionStart ?? chatInput.length;
    const end = input.selectionEnd ?? chatInput.length;
    const newValue = chatInput.slice(0, start) + emoji + chatInput.slice(end);
    setChatInput(newValue);

    // Restore focus and cursor position after emoji insertion
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + emoji.length;
      input.setSelectionRange(newPos, newPos);
    });
  }, [chatInput]);

  // Add reaction to a message
  const handleAddReaction = useCallback((messageId: string, emoji: string) => {
    if (!uid) return;
    
    actions.addReaction(roomCode, messageId, uid, emoji).catch((error) => {
      showError(error.message || "Failed to add reaction");
      console.error("[Chat] Failed to add reaction:", error);
    });
  }, [roomCode, uid, showError]);

  // Remove reaction from a message
  const handleRemoveReaction = useCallback((messageId: string, emoji: string) => {
    if (!uid) return;
    
    actions.removeReaction(roomCode, messageId, uid, emoji).catch((error) => {
      showError(error.message || "Failed to remove reaction");
      console.error("[Chat] Failed to remove reaction:", error);
    });
  }, [roomCode, uid, showError]);

  return {
    chatInput,
    setChatInput,
    handleSendMessage,
    isSending,
    inputRef,
    handleEmojiSelect,
    handleAddReaction,
    handleRemoveReaction,
  };
}
