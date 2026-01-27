/**
 * Chat actions hook - handles chat functionality.
 */

import { useState, useCallback } from "react";
import * as actions from "@/lib/rtdb-actions";

export interface UseChatActionsReturn {
  chatInput: string;
  setChatInput: (value: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
}

export function useChatActions(
  roomCode: string,
  uid: string | null
): UseChatActionsReturn {
  const [chatInput, setChatInput] = useState("");

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && uid) {
      actions.sendMessage(roomCode, uid, chatInput.trim(), "chat")
        .then(() => setChatInput(""))
        .catch(() => {});
    }
  }, [roomCode, chatInput, uid]);

  return {
    chatInput,
    setChatInput,
    handleSendMessage,
  };
}
