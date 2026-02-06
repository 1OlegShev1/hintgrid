/**
 * Barrel re-export for all rtdb modules.
 * Preserves the original import surface of lib/rtdb-actions.ts.
 */

// Room management
export {
  joinRoom,
  updateDisconnectBehavior,
  reassignOwnerIfNeeded,
  leaveRoom,
  deleteRoom,
  OWNER_DISCONNECT_GRACE_PERIOD_MS,
  type ReassignResult,
} from "./room-management";

// Game lifecycle
export {
  startGame,
  rematch,
  endGame,
  pauseGame,
  resumeGame,
} from "./game-lifecycle";

// Lobby actions
export {
  setTimerPreset,
  setWordPack,
  setCustomWords,
  setRoomLocked,
  setRoomName,
  kickPlayer,
  setLobbyRole,
  randomizeTeams,
} from "./lobby-actions";

// Gameplay
export {
  giveClue,
  voteCard,
  confirmReveal,
  endTurn,
} from "./gameplay";

// Chat
export {
  sendMessage,
  addReaction,
  removeReaction,
  pruneOldMessages,
} from "./chat";

// Public rooms
export {
  updatePublicRoomIndex,
  removeFromPublicRoomIndex,
  getPublicRooms,
  subscribeToPublicRooms,
  type PublicRoomData,
} from "./public-rooms";

// Maintenance
export {
  pruneStalePlayers,
} from "./maintenance";

// Helpers (exposed for hooks that need direct system messages)
export {
  pushSystemMessage,
} from "./helpers";
