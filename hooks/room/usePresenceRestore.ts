/**
 * Presence restoration hook - monitors Firebase connection and restores
 * player presence after reconnection.
 *
 * When Firebase connection drops, onDisconnect marks the player as disconnected.
 * When it reconnects, this hook re-marks the player as connected and
 * re-establishes the onDisconnect handler.
 */

import { useEffect, useRef } from "react";
import { ref, onValue, update, serverTimestamp, type DatabaseReference } from "firebase/database";
import { type Database } from "firebase/database";
import * as actions from "@/lib/rtdb";
import type { FirebaseRoomData } from "./types";
import type { FirebasePlayerData } from "@/shared/types";

interface PresenceRefs {
  /** Reference to the player's disconnect handler (set after join succeeds) */
  disconnectRef: React.MutableRefObject<DatabaseReference | null>;
  /** Latest room data snapshot */
  roomData: React.MutableRefObject<FirebaseRoomData | null>;
  /** Latest players data snapshot */
  playersData: React.MutableRefObject<Record<string, FirebasePlayerData> | null>;
}

/**
 * Restores player presence after a Firebase reconnection.
 * Only activates once the player has joined (disconnectRef is set).
 */
export function usePresenceRestore(
  db: Database | undefined,
  roomCode: string,
  playerId: string | null,
  refs: PresenceRefs
): void {
  const wasConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!db || !playerId || !roomCode) return;

    const connectedRef = ref(db, ".info/connected");

    const unsubConnected = onValue(connectedRef, (snap) => {
      const isConnected = snap.val() === true;

      // Detect actual reconnection: must have joined, then disconnected, then reconnected.
      const hasJoined = refs.disconnectRef.current !== null;
      const isReconnection = hasJoined && wasConnectedRef.current === false && isConnected;

      if (isReconnection) {
        const roomExists = refs.roomData.current !== null;
        const playerExists = refs.playersData.current?.[playerId] !== undefined;

        if (roomExists && playerExists) {
          const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
          update(playerRef, {
            connected: true,
            lastSeen: serverTimestamp(),
          }).catch((err) => {
            console.warn("[Room] Failed to restore presence after reconnection:", err.message);
          });

          // Re-establish onDisconnect handler after reconnection
          const currentConnected = refs.playersData.current
            ? Object.values(refs.playersData.current).filter((p) => p.connected !== false).length + 1
            : 1;
          actions.updateDisconnectBehavior(roomCode, playerId, currentConnected).catch((err) => {
            console.warn("[Room] Failed to update disconnect behavior after reconnection:", err.message);
          });
        }
      }

      wasConnectedRef.current = isConnected;
    });

    return () => {
      unsubConnected();
      wasConnectedRef.current = null;
    };
  }, [db, roomCode, playerId, refs]);
}
