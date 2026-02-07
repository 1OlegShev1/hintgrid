/**
 * Lightweight analytics wrapper around Firebase Analytics.
 * All methods are safe to call anywhere -- they silently no-op if
 * Analytics isn't available (SSR, missing config, ad blockers, etc.).
 */

import { getAnalytics, logEvent, isSupported, Analytics } from "firebase/analytics";
import { getFirebaseApp } from "./firebase";

let analytics: Analytics | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Firebase Analytics (call once on app load).
 * Safe to call multiple times; idempotent.
 */
export function initAnalytics(): void {
  if (initPromise || typeof window === "undefined") return;

  initPromise = isSupported()
    .then((supported) => {
      if (!supported) return;
      const app = getFirebaseApp();
      if (!app) return;
      analytics = getAnalytics(app);
    })
    .catch(() => {
      // Analytics blocked (ad blocker, etc.) — that's fine
    });
}

// ── Event helpers ──────────────────────────────────────────────────

/** Player created a new room */
export function trackRoomCreated(roomCode: string, visibility: string = "public"): void {
  if (!analytics) return;
  logEvent(analytics, "room_created", { room_code: roomCode, visibility });
}

/** Player joined an existing room */
export function trackRoomJoined(roomCode: string): void {
  if (!analytics) return;
  logEvent(analytics, "room_joined", { room_code: roomCode });
}

/** Game started */
export function trackGameStarted(roomCode: string, playerCount: number): void {
  if (!analytics) return;
  logEvent(analytics, "game_started", {
    room_code: roomCode,
    player_count: playerCount,
  });
}

/** Game completed (win or abandon) */
export function trackGameCompleted(
  roomCode: string,
  result: "win" | "trap" | "abandoned",
  winningTeam?: string,
  turnCount?: number
): void {
  if (!analytics) return;
  logEvent(analytics, "game_completed", {
    room_code: roomCode,
    result,
    winning_team: winningTeam ?? "none",
    turn_count: turnCount ?? 0,
  });
}

/** Rematch started */
export function trackRematch(roomCode: string): void {
  if (!analytics) return;
  logEvent(analytics, "rematch", { room_code: roomCode });
}

/** Player left a room (voluntary or kicked) */
export function trackPlayerLeft(roomCode: string, reason: "voluntary" | "kicked" | "disconnect"): void {
  if (!analytics) return;
  logEvent(analytics, "player_left", { room_code: roomCode, reason });
}

/** Room listed as public */
export function trackPublicRoomListed(roomCode: string): void {
  if (!analytics) return;
  logEvent(analytics, "public_room_listed", { room_code: roomCode });
}
