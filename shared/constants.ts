// localStorage keys
export const LOCAL_STORAGE_AVATAR_KEY = "hintgrid_avatar";
export const LOCAL_STORAGE_SOUND_VOLUME_KEY = "hintgrid_sound_volume";
export const LOCAL_STORAGE_SOUND_MUTED_KEY = "hintgrid_sound_muted";
export const LOCAL_STORAGE_MUSIC_ENABLED_KEY = "hintgrid_music_enabled";

// Game configuration
export const TURN_DURATIONS = [30, 60, 90] as const;
export const DEFAULT_TURN_DURATION = 60;
export const WORD_PACKS = ["classic", "kahoot"] as const;
export const DEFAULT_WORD_PACK = "classic";

// Validation limits
export const MAX_PLAYER_NAME_LENGTH = 20;
export const MAX_CLUE_LENGTH = 30;
export const MAX_CHAT_MESSAGE_LENGTH = 200;
export const MIN_PLAYERS_TO_START = 4;

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
