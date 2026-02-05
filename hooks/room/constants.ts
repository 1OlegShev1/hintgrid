/**
 * Constants for room hooks - extracted from inline magic numbers.
 */

/** Debounce delay for updating onDisconnect behavior after player list changes */
export const DISCONNECT_BEHAVIOR_DEBOUNCE_MS = 200;

/** Delay before calling leaveRoom on cleanup (allows quick remounts to cancel) */
export const LEAVE_ROOM_DELAY_MS = 200;

/** Buffer added to grace period remaining when scheduling owner reassignment retry */
export const OWNER_REASSIGN_RETRY_BUFFER_MS = 1000;

/** Delay before calling goOnline() after goOffline() when leaving a room */
export const RECONNECT_DELAY_MS = 100;
