/**
 * Input validation and sanitization utilities.
 * Used to ensure data integrity before storing in Firebase.
 */

import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_CLUE_LENGTH,
  MAX_CHAT_MESSAGE_LENGTH,
} from "./constants";

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
