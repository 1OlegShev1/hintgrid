/**
 * Input validation and sanitization utilities.
 * Used to ensure data integrity before storing in Firebase.
 */

import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_CLUE_LENGTH,
  MAX_CHAT_MESSAGE_LENGTH,
} from "./constants";
import { containsProfanity, censorProfanity } from "./profanity";

/**
 * Sanitize player name: trim whitespace and enforce max length.
 */
export function sanitizePlayerName(name: string): string {
  return name.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
}

/**
 * Sanitize clue word: trim whitespace and enforce max length.
 */
export function sanitizeClue(clue: string): string {
  return clue.trim().slice(0, MAX_CLUE_LENGTH);
}

/**
 * Sanitize chat message: trim whitespace and enforce max length.
 */
export function sanitizeChatMessage(message: string): string {
  return message.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH);
}

/**
 * Validate that a string is non-empty after trimming.
 */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Validate player name: non-empty and within length limit.
 */
export function isValidPlayerName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_PLAYER_NAME_LENGTH;
}

/**
 * Validation result with optional error message.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate player name with detailed error messages.
 * Checks: non-empty, length limit, profanity.
 */
export function validatePlayerName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Name is required" };
  }
  if (trimmed.length > MAX_PLAYER_NAME_LENGTH) {
    return { valid: false, error: `Name must be ${MAX_PLAYER_NAME_LENGTH} characters or less` };
  }
  if (containsProfanity(trimmed)) {
    return { valid: false, error: "Please choose a different name" };
  }
  return { valid: true };
}

/**
 * Validate clue word with detailed error messages.
 * Checks: non-empty, single word, length limit, profanity.
 */
export function validateClueWord(clue: string): ValidationResult {
  const trimmed = clue.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Clue is required" };
  }
  if (!/^\S+$/.test(trimmed)) {
    return { valid: false, error: "Clue must be a single word (no spaces)" };
  }
  if (trimmed.length > MAX_CLUE_LENGTH) {
    return { valid: false, error: `Clue must be ${MAX_CLUE_LENGTH} characters or less` };
  }
  if (containsProfanity(trimmed)) {
    return { valid: false, error: "Please choose a different clue" };
  }
  return { valid: true };
}

/**
 * Sanitize chat message: trim, enforce length, and censor profanity.
 */
export function sanitizeChatMessageWithCensor(message: string): string {
  const trimmed = message.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH);
  return censorProfanity(trimmed);
}

/**
 * Validate clue: single word (no spaces), non-empty, within length limit.
 */
export function isValidClueFormat(clue: string): boolean {
  const trimmed = clue.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_CLUE_LENGTH && /^\S+$/.test(trimmed);
}

/**
 * Validate chat message: non-empty and within length limit.
 */
export function isValidChatMessage(message: string): boolean {
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_CHAT_MESSAGE_LENGTH;
}
