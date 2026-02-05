/**
 * Owner reassignment hook - checks if the room owner is disconnected
 * and schedules ownership transfer with grace period retry.
 *
 * Only the first connected player (by ID order) attempts reassignment
 * to prevent multiple players from racing to transfer ownership.
 */

import { useEffect, useRef } from "react";
import * as actions from "@/lib/rtdb";
import { OWNER_REASSIGN_RETRY_BUFFER_MS } from "./constants";
import type { FirebasePlayerData } from "@/shared/types";

/**
 * Attempts owner reassignment when player data changes.
 * Handles grace period by scheduling a re-check after the period expires.
 */
export function useOwnerReassignment(
  roomCode: string,
  playerId: string | null,
  playersData: Record<string, FirebasePlayerData> | null
): void {
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!playerId || !roomCode || !playersData) return;

    // Only the first connected player (by ID order) should attempt reassignment
    const connectedPlayerIds = Object.entries(playersData)
      .filter(([, p]) => p.connected !== false)
      .map(([id]) => id)
      .sort();

    if (connectedPlayerIds[0] !== playerId) return;

    // Cancel any pending retry since we're checking now
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    actions.reassignOwnerIfNeeded(roomCode).then((result) => {
      // If owner is disconnected but within grace period, schedule a re-check
      if (result.withinGracePeriod && result.gracePeriodRemainingMs > 0) {
        const delay = result.gracePeriodRemainingMs + OWNER_REASSIGN_RETRY_BUFFER_MS;
        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          actions.reassignOwnerIfNeeded(roomCode).catch((err) => {
            console.warn("[Room] Failed to reassign owner after grace period:", err.message);
          });
        }, delay);
      }
    }).catch((err) => {
      console.warn("[Room] Failed to reassign owner:", err.message);
    });

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [roomCode, playerId, playersData]);
}
