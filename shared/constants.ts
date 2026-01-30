// localStorage keys
export const LOCAL_STORAGE_AVATAR_KEY = "hintgrid_avatar";
export const LOCAL_STORAGE_SOUND_VOLUME_KEY = "hintgrid_sound_volume";
export const LOCAL_STORAGE_SOUND_MUTED_KEY = "hintgrid_sound_muted";
export const LOCAL_STORAGE_MUSIC_ENABLED_KEY = "hintgrid_music_enabled";

// Game configuration
// Timer presets with separate durations for clue (hinter) and guess (seeker) phases
// First clue bonus gives extra time for each team's first clue (cold start is hardest)
export const TIMER_PRESETS = {
  fast: { clue: 60, guess: 45, firstClueBonus: 30, label: "Fast" },
  normal: { clue: 90, guess: 60, firstClueBonus: 45, label: "Normal" },
  relaxed: { clue: 120, guess: 90, firstClueBonus: 60, label: "Relaxed" },
} as const;

export type TimerPreset = keyof typeof TIMER_PRESETS;
export const TIMER_PRESET_KEYS = Object.keys(TIMER_PRESETS) as TimerPreset[];
export const DEFAULT_TIMER_PRESET: TimerPreset = "normal";

// Legacy support - kept for backwards compatibility with old rooms
// @deprecated Use TIMER_PRESETS instead
export const TURN_DURATIONS = [30, 60, 90] as const;
export const DEFAULT_TURN_DURATION = 60;

export const WORD_PACKS = ["classic", "kahoot", "geography", "popculture", "science", "space", "nature"] as const;
export const DEFAULT_WORD_PACK: typeof WORD_PACKS[number][] = ["classic"];

// Validation limits
export const MAX_PLAYER_NAME_LENGTH = 20;
export const MAX_CLUE_LENGTH = 30;
export const MAX_CHAT_MESSAGE_LENGTH = 200;
export const MAX_ROOM_NAME_LENGTH = 40;
export const MIN_PLAYERS_TO_START = 4;

// Custom words limits
export const MAX_CUSTOM_WORDS = 100; // Max words owner can store
export const MAX_CUSTOM_WORD_LENGTH = 30; // Same as clue limit
export const MAX_CUSTOM_WORDS_ON_BOARD = 15; // Max custom words that appear on board (10 slots reserved for packs)

// Public rooms
export const DEFAULT_VISIBILITY = "public" as const;
export const MAX_PLAYERS_DEFAULT = 300; // High limit for DDoS protection
export const MIN_PLAYERS_FOR_PUBLIC_LIST = 4; // Rooms need 4+ players to show in public list
export const PUBLIC_ROOMS_DISPLAY_LIMIT = 6; // Show top 6 on home page
export const BAN_DURATION_MS = 2 * 60 * 1000; // 2 minutes kick/ban duration

// Presence cleanup
export const STALE_PLAYER_GRACE_MS = 2 * 60 * 1000; // 2 minutes
export const STALE_PLAYER_CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds

// Avatars
export const AVATARS = [
  "🐱", "🐶", "🐻", "🦊", "🐼", "🦁", "🐯", "🐮",
  "🐷", "🐸", "🐵", "🐔", "🦄", "🐲", "🦖", "🐙",
  "🦋", "🐝", "🐢", "🦜", "🎃", "🤖", "👻", "👾",
] as const;

// Reaction emojis for chat messages
export const REACTION_EMOJIS = [
  "👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🎉",
  "🤔", "👀", "🔥", "💯", "👏", "🙌", "💀", "😭",
  "🤣", "😍", "🫡", "✨",
] as const;

export type ReactionEmoji = typeof REACTION_EMOJIS[number];

export type Avatar = typeof AVATARS[number];

export function getRandomAvatar(): Avatar {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
