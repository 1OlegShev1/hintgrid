/**
 * Public room index management.
 * Handles listing, subscribing to, and maintaining the public rooms index.
 */

import {
  ref, get, set, remove,
  onValue,
  Unsubscribe,
} from "firebase/database";
import { getDb, type RoomData, type PlayerData } from "./helpers";
import { DEFAULT_TIMER_PRESET } from "@/shared/constants";

export interface PublicRoomData {
  roomCode: string;
  roomName: string;
  ownerName: string;
  playerCount: number;
  status: "lobby" | "playing" | "paused";
  timerPreset: string;
  createdAt: number;
}

/**
 * Update the public room index entry for a room.
 * Called when room state changes (player count, game status, etc.)
 * Only updates if room is public and not locked.
 */
export async function updatePublicRoomIndex(
  roomCode: string,
  roomData: RoomData,
  players: Record<string, PlayerData>
): Promise<void> {
  // Only index public, unlocked rooms
  // Default to public if visibility is not set (for backwards compatibility)
  const isPublic = roomData.visibility === "public" || roomData.visibility === undefined;
  if (!isPublic || roomData.locked) {
    return;
  }
  
  const db = getDb();
  const publicRoomRef = ref(db, `publicRooms/${roomCode}`);
  
  // Get owner name for display
  const owner = players[roomData.ownerId];
  const ownerName = owner?.name || "Unknown";
  
  // Count connected players
  const playerCount = Object.values(players).filter(p => p.connected).length;
  
  // Determine room status
  let status: "lobby" | "playing" | "paused" = "lobby";
  if (roomData.gameStarted && !roomData.gameOver) {
    status = roomData.paused ? "paused" : "playing";
  }
  
  // Room name with fallback
  const roomName = roomData.roomName || `${ownerName}'s Room`;
  
  await set(publicRoomRef, {
    roomName,
    ownerName,
    playerCount,
    status,
    timerPreset: roomData.timerPreset || DEFAULT_TIMER_PRESET,
    createdAt: roomData.createdAt || Date.now(),
  });
}

/**
 * Remove a room from the public index.
 * Called when room is deleted, locked, or made private.
 */
export async function removeFromPublicRoomIndex(roomCode: string): Promise<void> {
  const db = getDb();
  const publicRoomRef = ref(db, `publicRooms/${roomCode}`);
  await remove(publicRoomRef);
}

/**
 * Get list of public rooms for the home page.
 * Returns rooms sorted by player count (descending), limited to top N.
 * 
 * Also cleans up orphaned index entries - rooms where the actual room no longer exists.
 * This happens when onDisconnect deletes the room but the index wasn't cleaned up.
 */
export async function getPublicRooms(limit: number = 6): Promise<PublicRoomData[]> {
  const db = getDb();
  const publicRoomsRef = ref(db, "publicRooms");
  const snapshot = await get(publicRoomsRef);
  
  if (!snapshot.exists()) return [];
  
  const rooms = snapshot.val() as Record<string, {
    roomName: string;
    ownerName: string;
    playerCount: number;
    status: "lobby" | "playing" | "paused";
    timerPreset: string;
    createdAt: number;
  }>;
  
  // Convert to array, filter by min players, sort by count
  const candidates = Object.entries(rooms)
    .map(([roomCode, data]) => ({ roomCode, ...data }))
    .filter(room => room.playerCount >= 4) // Only show rooms with 4+ players
    .sort((a, b) => b.playerCount - a.playerCount);
  
  // Check if each candidate room actually exists (verify not orphaned)
  // Check up to 50 entries to catch any orphaned entries (fallback safety net)
  // The onDisconnect handler removes both room and publicRooms, but this provides
  // additional cleanup in case of network issues or timing edge cases
  const toCheck = candidates.slice(0, Math.min(candidates.length, 50));
  const validRooms: typeof candidates = [];
  const orphanedCodes: string[] = [];
  
  await Promise.all(toCheck.map(async (room) => {
    const roomRef = ref(db, `rooms/${room.roomCode}`);
    const roomSnap = await get(roomRef);
    if (roomSnap.exists()) {
      validRooms.push(room);
    } else {
      orphanedCodes.push(room.roomCode);
    }
  }));
  
  // Clean up orphaned index entries in background (don't block response)
  if (orphanedCodes.length > 0) {
    Promise.all(orphanedCodes.map(code => 
      remove(ref(db, `publicRooms/${code}`))
    )).catch(err => {
      console.warn("[getPublicRooms] Failed to clean orphaned entries:", err.message);
    });
  }
  
  // Sort again (Promise.all doesn't preserve order) and limit
  return validRooms
    .sort((a, b) => b.playerCount - a.playerCount)
    .slice(0, limit);
}

/**
 * Subscribe to real-time updates of public rooms.
 * Returns an unsubscribe function.
 * 
 * This provides instant updates when rooms change (player count, status, etc.)
 * instead of polling. The callback receives the filtered and sorted room list.
 */
export function subscribeToPublicRooms(
  limit: number = 6,
  onRoomsChange: (rooms: PublicRoomData[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDb();
  const publicRoomsRef = ref(db, "publicRooms");
  
  return onValue(
    publicRoomsRef,
    (snapshot) => {
      // Wrap async logic in an IIFE with error handling
      // (onValue doesn't await callbacks, so we handle errors ourselves)
      (async () => {
        if (!snapshot.exists()) {
          onRoomsChange([]);
          return;
        }
        
        const rooms = snapshot.val() as Record<string, {
          roomName: string;
          ownerName: string;
          playerCount: number;
          status: "lobby" | "playing" | "paused";
          timerPreset: string;
          createdAt: number;
        }>;
        
        // Convert to array, filter by min players, sort by count
        const candidates = Object.entries(rooms)
          .map(([roomCode, data]) => ({ roomCode, ...data }))
          .filter(room => room.playerCount >= 4) // Only show rooms with 4+ players
          .sort((a, b) => b.playerCount - a.playerCount);
        
        // Check if each candidate room actually exists (verify not orphaned)
        // Check up to 50 entries to catch any orphaned entries (fallback safety net)
        // The onDisconnect handler removes both room and publicRooms, but this provides
        // additional cleanup in case of network issues or timing edge cases
        const toCheck = candidates.slice(0, Math.min(candidates.length, 50));
        const validRooms: typeof candidates = [];
        const orphanedCodes: string[] = [];
        
        await Promise.all(toCheck.map(async (room) => {
          const roomRef = ref(db, `rooms/${room.roomCode}`);
          const roomSnap = await get(roomRef);
          if (roomSnap.exists()) {
            validRooms.push(room);
          } else {
            orphanedCodes.push(room.roomCode);
          }
        }));
        
        // Clean up orphaned index entries in background
        if (orphanedCodes.length > 0) {
          Promise.all(orphanedCodes.map(code => 
            remove(ref(db, `publicRooms/${code}`))
          )).catch(err => {
            console.warn("[subscribeToPublicRooms] Failed to clean orphaned entries:", err.message);
          });
        }
        
        // Sort again and limit
        const result = validRooms
          .sort((a, b) => b.playerCount - a.playerCount)
          .slice(0, limit);
        
        onRoomsChange(result);
      })().catch(err => {
        console.error("[subscribeToPublicRooms] Async error:", err);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      });
    },
    (error) => {
      console.error("[subscribeToPublicRooms] Subscription error:", error);
      onError?.(error);
    }
  );
}
