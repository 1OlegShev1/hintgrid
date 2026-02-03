import { describe, it, expect } from "vitest";
import {
  sanitizePlayerName,
  sanitizeClue,
  sanitizeChatMessage,
  isNonEmpty,
  isValidPlayerName,
  isValidClueFormat,
  isValidChatMessage,
  validatePlayerName,
  validateClueWord,
  sanitizeChatMessageWithCensor,
  validateCustomWord,
  parseCustomWordsInput,
} from "../validation";
import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_CLUE_LENGTH,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_CUSTOM_WORD_LENGTH,
  MAX_CUSTOM_WORDS,
} from "../constants";
import { containsProfanity, censorProfanity } from "../profanity";

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

// Profanity filter tests
describe("containsProfanity", () => {
  it("detects obvious profanity", () => {
    expect(containsProfanity("shit")).toBe(true);
    expect(containsProfanity("fuck")).toBe(true);
    expect(containsProfanity("ass")).toBe(true);
  });

  it("detects profanity in sentences", () => {
    expect(containsProfanity("what the shit")).toBe(true);
    expect(containsProfanity("this is fucking great")).toBe(true);
  });

  it("returns false for clean text", () => {
    expect(containsProfanity("hello")).toBe(false);
    expect(containsProfanity("good game")).toBe(false);
    expect(containsProfanity("Player1")).toBe(false);
    expect(containsProfanity("class")).toBe(false); // contains "ass" but is a valid word
  });

  it("is case insensitive", () => {
    expect(containsProfanity("SHIT")).toBe(true);
    expect(containsProfanity("Shit")).toBe(true);
    expect(containsProfanity("FUCK")).toBe(true);
  });
});

describe("censorProfanity", () => {
  it("replaces profanity with asterisks", () => {
    const result = censorProfanity("what the shit");
    expect(result).not.toContain("shit");
    expect(result).toContain("***");
  });

  it("preserves clean text", () => {
    expect(censorProfanity("hello world")).toBe("hello world");
  });

  it("handles text with multiple profane words", () => {
    const result = censorProfanity("shit and fuck");
    expect(result).not.toContain("shit");
    expect(result).not.toContain("fuck");
  });
});

describe("validatePlayerName", () => {
  it("returns valid for clean names", () => {
    expect(validatePlayerName("Alice")).toEqual({ valid: true });
    expect(validatePlayerName("Player 1")).toEqual({ valid: true });
  });

  it("returns error for empty names", () => {
    const result = validatePlayerName("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Name is required");
  });

  it("returns error for names exceeding max length", () => {
    const longName = "A".repeat(MAX_PLAYER_NAME_LENGTH + 1);
    const result = validatePlayerName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("characters or less");
  });

  it("returns error for profane names", () => {
    const result = validatePlayerName("shit");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Please choose a different name");
  });

  it("returns error for names containing profanity", () => {
    const result = validatePlayerName("Mr Fuck");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Please choose a different name");
  });
});

describe("validateClueWord", () => {
  it("returns valid for clean clues", () => {
    expect(validateClueWord("ANIMAL")).toEqual({ valid: true });
    expect(validateClueWord("word")).toEqual({ valid: true });
  });

  it("returns error for empty clues", () => {
    const result = validateClueWord("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Clue is required");
  });

  it("returns error for clues with spaces", () => {
    const result = validateClueWord("two words");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("single word");
  });

  it("returns error for clues exceeding max length", () => {
    const longClue = "A".repeat(MAX_CLUE_LENGTH + 1);
    const result = validateClueWord(longClue);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("characters or less");
  });

  it("returns error for profane clues", () => {
    const result = validateClueWord("shit");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Please choose a different clue");
  });
});

describe("sanitizeChatMessageWithCensor", () => {
  it("censors profanity in messages", () => {
    const result = sanitizeChatMessageWithCensor("that was shit");
    expect(result).not.toContain("shit");
    expect(result).toContain("***");
  });

  it("trims whitespace", () => {
    expect(sanitizeChatMessageWithCensor("  hello  ")).toBe("hello");
  });

  it("truncates to max length", () => {
    const longMessage = "M".repeat(MAX_CHAT_MESSAGE_LENGTH + 50);
    expect(sanitizeChatMessageWithCensor(longMessage).length).toBeLessThanOrEqual(MAX_CHAT_MESSAGE_LENGTH);
  });

  it("preserves clean messages", () => {
    expect(sanitizeChatMessageWithCensor("Good game!")).toBe("Good game!");
  });
});

describe("validateCustomWord", () => {
  it("returns valid for clean single words", () => {
    expect(validateCustomWord("APPLE")).toEqual({ valid: true });
    expect(validateCustomWord("word")).toEqual({ valid: true });
  });

  it("returns valid for words with spaces (like ICE CREAM)", () => {
    expect(validateCustomWord("ICE CREAM")).toEqual({ valid: true });
    expect(validateCustomWord("NEW YORK")).toEqual({ valid: true });
  });

  it("trims whitespace before validation", () => {
    expect(validateCustomWord("  APPLE  ")).toEqual({ valid: true });
  });

  it("returns error for empty words", () => {
    const result = validateCustomWord("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Word cannot be empty");
  });

  it("returns error for whitespace-only words", () => {
    const result = validateCustomWord("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Word cannot be empty");
  });

  it("returns error for words exceeding max length", () => {
    const longWord = "A".repeat(MAX_CUSTOM_WORD_LENGTH + 1);
    const result = validateCustomWord(longWord);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(`Word must be ${MAX_CUSTOM_WORD_LENGTH} characters or less`);
  });

  it("returns valid for words at max length", () => {
    const maxWord = "A".repeat(MAX_CUSTOM_WORD_LENGTH);
    expect(validateCustomWord(maxWord)).toEqual({ valid: true });
  });

  it("returns error for profane words", () => {
    const result = validateCustomWord("shit");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Word contains inappropriate content");
  });

  it("returns error for words containing profanity", () => {
    const result = validateCustomWord("fucking great");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Word contains inappropriate content");
  });
});

describe("parseCustomWordsInput", () => {
  it("parses comma-separated words", () => {
    const result = parseCustomWordsInput("apple,banana,cherry");
    expect(result.words).toEqual(["APPLE", "BANANA", "CHERRY"]);
    expect(result.errors).toEqual([]);
  });

  it("parses newline-separated words", () => {
    const result = parseCustomWordsInput("apple\nbanana\ncherry");
    expect(result.words).toEqual(["APPLE", "BANANA", "CHERRY"]);
    expect(result.errors).toEqual([]);
  });

  it("parses mixed comma and newline separated words", () => {
    const result = parseCustomWordsInput("apple,banana\ncherry,date");
    expect(result.words).toEqual(["APPLE", "BANANA", "CHERRY", "DATE"]);
    expect(result.errors).toEqual([]);
  });

  it("trims whitespace from words", () => {
    const result = parseCustomWordsInput("  apple  ,  banana  \n  cherry  ");
    expect(result.words).toEqual(["APPLE", "BANANA", "CHERRY"]);
    expect(result.errors).toEqual([]);
  });

  it("converts words to uppercase", () => {
    const result = parseCustomWordsInput("Apple,BANANA,cherry");
    expect(result.words).toEqual(["APPLE", "BANANA", "CHERRY"]);
    expect(result.errors).toEqual([]);
  });

  it("filters out empty entries", () => {
    const result = parseCustomWordsInput("apple,,banana,\n,cherry");
    expect(result.words).toEqual(["APPLE", "BANANA", "CHERRY"]);
    expect(result.errors).toEqual([]);
  });

  it("handles words with spaces (like ICE CREAM)", () => {
    const result = parseCustomWordsInput("ICE CREAM,NEW YORK");
    expect(result.words).toEqual(["ICE CREAM", "NEW YORK"]);
    expect(result.errors).toEqual([]);
  });

  it("rejects empty words", () => {
    const result = parseCustomWordsInput("apple,,banana");
    // Empty entries are filtered, not rejected
    expect(result.words).toEqual(["APPLE", "BANANA"]);
    expect(result.errors).toEqual([]);
  });

  it("rejects words that are too long", () => {
    const longWord = "A".repeat(MAX_CUSTOM_WORD_LENGTH + 1);
    const result = parseCustomWordsInput(`apple,${longWord},banana`);
    expect(result.words).toEqual(["APPLE", "BANANA"]);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("must be");
    expect(result.errors[0]).toContain("characters or less");
  });

  it("rejects profane words", () => {
    const result = parseCustomWordsInput("apple,shit,banana");
    expect(result.words).toEqual(["APPLE", "BANANA"]);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("inappropriate content");
  });

  it("detects duplicate words within input", () => {
    const result = parseCustomWordsInput("apple,banana,APPLE");
    expect(result.words).toEqual(["APPLE", "BANANA"]);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("Already added");
  });

  it("detects duplicates against existing words", () => {
    const existing = ["APPLE", "BANANA"];
    const result = parseCustomWordsInput("cherry,APPLE,date", existing);
    expect(result.words).toEqual(["CHERRY", "DATE"]);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("Already added");
  });

  it("case-insensitive duplicate detection", () => {
    const result = parseCustomWordsInput("apple,APPLE,Apple");
    expect(result.words).toEqual(["APPLE"]);
    expect(result.errors.length).toBe(2);
    expect(result.errors[0]).toContain("Already added");
    expect(result.errors[1]).toContain("Already added");
  });

  it("enforces max custom words limit", () => {
    const existing = Array(MAX_CUSTOM_WORDS - 2).fill(null).map((_, i) => `WORD${i}`);
    const result = parseCustomWordsInput("apple,banana,cherry", existing);
    expect(result.words).toEqual(["APPLE", "BANANA"]); // Only 2 should be added
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain(`Maximum ${MAX_CUSTOM_WORDS}`);
  });

  it("stops processing at max limit", () => {
    const existing = Array(MAX_CUSTOM_WORDS - 1).fill(null).map((_, i) => `WORD${i}`);
    const result = parseCustomWordsInput("apple,banana,cherry,date", existing);
    expect(result.words).toEqual(["APPLE"]); // Only 1 spot left
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain(`Maximum ${MAX_CUSTOM_WORDS}`);
  });

  it("truncates long word names in error messages", () => {
    const longWord = "A".repeat(MAX_CUSTOM_WORD_LENGTH + 5); // Make it longer than max
    const result = parseCustomWordsInput(longWord);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toMatch(/^".{20}\.\.\.":/); // Should be truncated to 20 chars + "..."
  });

  it("handles empty input", () => {
    const result = parseCustomWordsInput("");
    expect(result.words).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("handles whitespace-only input", () => {
    const result = parseCustomWordsInput("   \n\n   ");
    expect(result.words).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("accumulates multiple errors", () => {
    const longWord = "A".repeat(MAX_CUSTOM_WORD_LENGTH + 1);
    const result = parseCustomWordsInput(`apple,shit,${longWord},apple`);
    expect(result.words).toEqual(["APPLE"]); // Only first apple is valid
    expect(result.errors.length).toBe(3); // profanity, too long, duplicate
  });
});
