import { describe, it, expect } from "vitest";
import {
  sanitizePlayerName,
  sanitizeClue,
  sanitizeChatMessage,
  isNonEmpty,
  isValidPlayerName,
  isValidClueFormat,
  isValidChatMessage,
} from "../validation";
import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_CLUE_LENGTH,
  MAX_CHAT_MESSAGE_LENGTH,
} from "../constants";

describe("sanitizePlayerName", () => {
  it("trims whitespace", () => {
    expect(sanitizePlayerName("  Alice  ")).toBe("Alice");
  });

  it("truncates to max length", () => {
    const longName = "A".repeat(MAX_PLAYER_NAME_LENGTH + 10);
    expect(sanitizePlayerName(longName).length).toBe(MAX_PLAYER_NAME_LENGTH);
  });

  it("handles empty string", () => {
    expect(sanitizePlayerName("")).toBe("");
  });

  it("handles only whitespace", () => {
    expect(sanitizePlayerName("   ")).toBe("");
  });

  it("preserves valid names", () => {
    expect(sanitizePlayerName("Player1")).toBe("Player1");
  });
});

describe("sanitizeClue", () => {
  it("trims whitespace", () => {
    expect(sanitizeClue("  WORD  ")).toBe("WORD");
  });

  it("truncates to max length", () => {
    const longClue = "W".repeat(MAX_CLUE_LENGTH + 10);
    expect(sanitizeClue(longClue).length).toBe(MAX_CLUE_LENGTH);
  });

  it("handles empty string", () => {
    expect(sanitizeClue("")).toBe("");
  });

  it("preserves valid clues", () => {
    expect(sanitizeClue("ANIMAL")).toBe("ANIMAL");
  });
});

describe("sanitizeChatMessage", () => {
  it("trims whitespace", () => {
    expect(sanitizeChatMessage("  Hello!  ")).toBe("Hello!");
  });

  it("truncates to max length", () => {
    const longMessage = "M".repeat(MAX_CHAT_MESSAGE_LENGTH + 50);
    expect(sanitizeChatMessage(longMessage).length).toBe(MAX_CHAT_MESSAGE_LENGTH);
  });

  it("handles empty string", () => {
    expect(sanitizeChatMessage("")).toBe("");
  });

  it("preserves valid messages", () => {
    expect(sanitizeChatMessage("Good guess!")).toBe("Good guess!");
  });
});

describe("isNonEmpty", () => {
  it("returns true for non-empty strings", () => {
    expect(isNonEmpty("hello")).toBe(true);
  });

  it("returns false for empty strings", () => {
    expect(isNonEmpty("")).toBe(false);
  });

  it("returns false for whitespace-only strings", () => {
    expect(isNonEmpty("   ")).toBe(false);
  });
});

describe("isValidPlayerName", () => {
  it("returns true for valid names", () => {
    expect(isValidPlayerName("Alice")).toBe(true);
    expect(isValidPlayerName("Player 1")).toBe(true);
  });

  it("returns false for empty names", () => {
    expect(isValidPlayerName("")).toBe(false);
    expect(isValidPlayerName("   ")).toBe(false);
  });

  it("returns false for names exceeding max length", () => {
    const longName = "A".repeat(MAX_PLAYER_NAME_LENGTH + 1);
    expect(isValidPlayerName(longName)).toBe(false);
  });

  it("returns true for names at max length", () => {
    const maxName = "A".repeat(MAX_PLAYER_NAME_LENGTH);
    expect(isValidPlayerName(maxName)).toBe(true);
  });
});

describe("isValidClueFormat", () => {
  it("returns true for single word clues", () => {
    expect(isValidClueFormat("ANIMAL")).toBe(true);
    expect(isValidClueFormat("word")).toBe(true);
  });

  it("returns false for clues with spaces", () => {
    expect(isValidClueFormat("two words")).toBe(false);
    expect(isValidClueFormat("a b")).toBe(false);
  });

  it("returns false for empty clues", () => {
    expect(isValidClueFormat("")).toBe(false);
    expect(isValidClueFormat("   ")).toBe(false);
  });

  it("returns false for clues exceeding max length", () => {
    const longClue = "A".repeat(MAX_CLUE_LENGTH + 1);
    expect(isValidClueFormat(longClue)).toBe(false);
  });

  it("returns true for clues at max length", () => {
    const maxClue = "A".repeat(MAX_CLUE_LENGTH);
    expect(isValidClueFormat(maxClue)).toBe(true);
  });

  it("handles clues with trimmed whitespace", () => {
    expect(isValidClueFormat("  word  ")).toBe(true);
  });
});

describe("isValidChatMessage", () => {
  it("returns true for valid messages", () => {
    expect(isValidChatMessage("Hello!")).toBe(true);
    expect(isValidChatMessage("Good guess team")).toBe(true);
  });

  it("returns false for empty messages", () => {
    expect(isValidChatMessage("")).toBe(false);
    expect(isValidChatMessage("   ")).toBe(false);
  });

  it("returns false for messages exceeding max length", () => {
    const longMessage = "M".repeat(MAX_CHAT_MESSAGE_LENGTH + 1);
    expect(isValidChatMessage(longMessage)).toBe(false);
  });

  it("returns true for messages at max length", () => {
    const maxMessage = "M".repeat(MAX_CHAT_MESSAGE_LENGTH);
    expect(isValidChatMessage(maxMessage)).toBe(true);
  });
});
