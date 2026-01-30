export type Team = "red" | "blue" | "neutral" | "trap";

export type WordPack = "classic" | "kahoot" | "geography" | "popculture" | "science" | "space" | "nature";

// Word pack selection can be a single pack or multiple packs combined
export type WordPackSelection = WordPack | WordPack[];

export type TimerPreset = "fast" | "normal" | "relaxed";

export type Visibility = "public" | "private";

export type Role = "clueGiver" | "guesser";
export type LobbyTeam = "red" | "blue" | null;
export type LobbyRole = "clueGiver" | "guesser" | null;

export interface Card {
  word: string;
  team: Team;
  revealed: boolean;
  revealedBy?: string; // Player ID who revealed this card
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  team: Team | null;
  role: Role | null;
  connected?: boolean;
  lastSeen?: number | null;
}

export type PauseReason = "teamDisconnected" | "clueGiverDisconnected" | "noGuessers" | "ownerPaused" | null;

export interface GameState {
  roomCode: string;
  players: Player[];
  board: Card[];
  ownerId: string | null;
  cardVotes: Record<number, string[]>;
  currentTeam: Team;
  startingTeam: Team;
  wordPack: WordPack[]; // Selected word pack(s) for this game
  customWords: string[]; // Room owner's custom words (uppercase, deduplicated)
  currentClue: { word: string; count: number } | null;
  remainingGuesses: number | null;
  turnStartTime: number | null;
  // Timer configuration
  timerPreset: TimerPreset;
  redHasGivenClue: boolean; // True after red team gives their first clue (for first clue bonus)
  blueHasGivenClue: boolean; // True after blue team gives their first clue (for first clue bonus)
  // @deprecated Legacy field - use timerPreset instead
  turnDuration: number; // in seconds
  gameStarted: boolean;
  gameOver: boolean;
  winner: Team | null;
  paused: boolean;
  pauseReason: PauseReason;
  pausedForTeam: Team | null;
  locked: boolean; // Whether new players can join (existing players can still rejoin)
  // Public rooms feature
  visibility: Visibility;
  roomName: string; // Display name for public rooms (auto-generated if not set)
  maxPlayers: number; // Maximum players allowed in room
  bannedPlayers: Record<string, number>; // playerId -> ban expiry timestamp
}

export interface ChatMessage {
  id: string;
  playerId?: string;
  playerName: string;
  playerAvatar?: string;
  message: string;
  timestamp: number;
  type: "clue" | "chat" | "system" | "reveal" | "game-system";
  // For clue messages: which team gave the clue
  clueTeam?: "red" | "blue";
  // For reveal messages: what team the card belonged to
  revealedTeam?: Team;
  // Emoji reactions: emoji -> playerIds
  reactions?: Record<string, string[]>;
}

export type RoomClosedReason = "abandoned" | "allPlayersLeft" | "timeout";

/**
 * Public room info stored in /publicRooms index for discovery.
 * This is a denormalized view for efficient querying on the home page.
 */
export interface PublicRoomInfo {
  roomCode: string; // Included when reading from index
  roomName: string;
  ownerName: string;
  playerCount: number;
  status: "lobby" | "playing" | "paused";
  timerPreset: TimerPreset;
  createdAt: number;
}

/**
 * Public room data as stored in Firebase /publicRooms/{roomCode}.
 * Note: roomCode is the key, not stored in the value.
 */
export interface FirebasePublicRoomData {
  roomName: string;
  ownerName: string;
  playerCount: number;
  status: "lobby" | "playing" | "paused";
  timerPreset: TimerPreset;
  createdAt: number;
}

// ============================================================================
// Firebase Data Structures (matches RTDB schema exactly)
// ============================================================================

/**
 * Board card as stored in Firebase.
 * Note: votes use Record<string, boolean> for RTDB efficiency (vs array).
 */
export interface FirebaseBoardCard {
  word: string;
  team: Team;
  revealed: boolean;
  revealedBy: string | null;
  votes: Record<string, boolean>;
}

/**
 * Player data as stored in Firebase.
 * Note: id is NOT included here - it's the Record key in players collection.
 */
export interface FirebasePlayerData {
  name: string;
  avatar: string;
  team: Team | null;
  role: Role | null;
  connected: boolean;
  lastSeen: number;
}

/**
 * Message data as stored in Firebase.
 * Note: id is NOT included here - it's the Record key in messages collection.
 */
export interface FirebaseMessageData {
  playerId: string | null;
  playerName: string;
  playerAvatar?: string;
  message: string;
  timestamp: number;
  type: "clue" | "chat" | "system" | "reveal" | "game-system";
  // For clue messages: which team gave the clue
  clueTeam?: "red" | "blue";
  // For reveal messages: what team the card belonged to
  revealedTeam?: Team;
  // Emoji reactions: emoji -> { playerId: true }
  reactions?: Record<string, Record<string, boolean>>;
}

/**
 * Room data as stored in Firebase (excluding players and messages collections).
 */
export interface FirebaseRoomData {
  ownerId: string;
  currentTeam: Team;
  startingTeam: Team;
  wordPack: WordPack | WordPack[]; // Can be single (legacy) or array (new)
  customWords?: string[]; // Room owner's custom words (uppercase, deduplicated)
  currentClue: { word: string; count: number } | null;
  remainingGuesses: number | null;
  turnStartTime: number | null;
  // Timer configuration
  timerPreset?: TimerPreset; // Optional for backwards compatibility with old rooms
  redHasGivenClue?: boolean;
  blueHasGivenClue?: boolean;
  // @deprecated Legacy field - kept for backwards compatibility
  turnDuration?: number;
  gameStarted: boolean;
  gameOver: boolean;
  winner: Team | null;
  paused: boolean;
  pauseReason: PauseReason;
  pausedForTeam: Team | null;
  locked?: boolean; // Whether new players can join (optional for backwards compatibility)
  // Public rooms feature
  visibility?: Visibility; // default "public" for new rooms
  roomName?: string; // Display name for public rooms
  maxPlayers?: number; // Maximum players allowed (default from constants)
  bannedPlayers?: Record<string, number>; // playerId -> ban expiry timestamp
  createdAt: number;
  board: FirebaseBoardCard[];
  players?: Record<string, FirebasePlayerData>;
  messages?: Record<string, FirebaseMessageData>;
}
