/**
 * Profanity filter utilities using bad-words-next.
 * Provides both blocking (check) and censoring (filter) capabilities.
 */

import BadWordsNext from "bad-words-next";
import en from "bad-words-next/lib/en";

// Initialize filter with English dictionary
const filter = new BadWordsNext({ data: en });

/**
 * Check if text contains profanity.
 * Use for blocking input (nicknames, clues).
 */
export function containsProfanity(text: string): boolean {
  return filter.check(text);
}

/**
 * Censor profanity in text, replacing bad words with ***.
 * Use for chat messages where we want to allow but sanitize.
 */
export function censorProfanity(text: string): string {
  return filter.filter(text);
}
