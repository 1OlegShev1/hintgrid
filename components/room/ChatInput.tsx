"use client";

import { EmojiPickerButton } from "@/components/room";
import { Button } from "@/components/ui";
import type { RoomChat } from "@/hooks/useRtdbRoom";

interface ChatInputProps {
  chat: RoomChat;
}

/**
 * Chat input form with emoji picker, text input, and send button.
 * Shared between GameView and LobbyView.
 */
export function ChatInput({ chat }: ChatInputProps) {
  return (
    <form onSubmit={chat.send} className="chat-input-container mt-3 pt-2 border-t border-border shrink-0">
      <div className="flex gap-2 items-center">
        <EmojiPickerButton
          onEmojiSelect={chat.onEmojiSelect}
          disabled={chat.isSending}
          inputRef={chat.inputRef}
        />
        <input
          ref={chat.inputRef}
          type="text"
          value={chat.input}
          onChange={(e) => chat.setInput(e.target.value)}
          placeholder="Type message..."
          disabled={chat.isSending}
          className="flex-1 min-w-0 px-3 py-2.5 text-base border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-elevated text-foreground disabled:opacity-50"
        />
        <Button
          type="submit"
          disabled={!chat.input.trim()}
          isLoading={chat.isSending}
          variant="primary"
          className="min-w-[60px]"
        >
          Send
        </Button>
      </div>
    </form>
  );
}
