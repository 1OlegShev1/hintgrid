/**
 * Room connection hook - manages real-time subscriptions and presence.
 * Uses onDisconnect for reliable presence detection.
 * Monitors .info/connected to restore presence after reconnection.
 */

import { useEffect, useState, useRef } from "react";
import { ref, onValue, query, orderByChild, limitToLast, DatabaseReference, update, serverTimestamp } from "firebase/database";
import { getDatabase } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import * as actions from "@/lib/rtdb-actions";
import { toGameState, toPlayers, toMessages, PlayerData, GameState, Player, ChatMessage, RoomClosedReason, FirebaseRoomData } from "./types";

export interface UseRoomConnectionReturn {
  gameState: GameState | null;
  players: Player[];
  currentPlayer: Player | null;
  messages: ChatMessage[];
  isConnecting: boolean;
  connectionError: string | null;
  setConnectionError: (error: string | null) => void;
  connectedPlayerCount: number;
  roomClosedReason: RoomClosedReason | null;
  uid: string | null;
}

export function useRoomConnection(
  roomCode: string,
  playerName: string,
  playerAvatar: string,
  visibility?: "public" | "private"
): UseRoomConnectionReturn {
  const { uid, isLoading: authLoading } = useAuth();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectedPlayerCount, setConnectedPlayerCount] = useState(0);
  const [roomClosedReason, setRoomClosedReason] = useState<RoomClosedReason | null>(null);

  const roomDataRef = useRef<FirebaseRoomData | null>(null);
  const playersDataRef = useRef<Record<string, PlayerData> | null>(null);
  const disconnectRefRef = useRef<DatabaseReference | null>(null);
  const wasConnectedRef = useRef<boolean | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ownerReassignTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Main effect: join room and set up listeners
  useEffect(() => {
    // Wait for auth to be ready and all required params
    if (authLoading || !uid || !playerName || !roomCode || !playerAvatar) return;

    const db = getDatabase();
    if (!db) {
      setConnectionError("Database not initialized");
      setIsConnecting(false);
      return;
    }

    // Cancel any pending leave from a previous cleanup (handles component remount)
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    // Use AbortController pattern to prevent operations after cleanup
    let isCleanedUp = false;

    setIsConnecting(true);
    setConnectionError(null);

    const playerId = uid;

    const roomRef = ref(db, `rooms/${roomCode}`);
    const playersRef = ref(db, `rooms/${roomCode}/players`);
    const messagesRef = ref(db, `rooms/${roomCode}/messages`);
    const connectedRef = ref(db, ".info/connected");

    let roomExists = false;

    const rebuild = () => {
      if (isCleanedUp) return;
      const playersList = toPlayers(playersDataRef.current);
      setPlayers(playersList);
      setCurrentPlayer(playersList.find((p) => p.id === playerId) || null);
      setGameState(roomDataRef.current ? toGameState(roomCode, roomDataRef.current, playersList) : null);
    };

    // Room listener
    const unsubRoom = onValue(roomRef, (snap) => {
      if (isCleanedUp) return;
      if (!snap.exists()) {
        if (roomExists) {
          setRoomClosedReason("allPlayersLeft");
          roomDataRef.current = null;
          setGameState(null);
        }
        return;
      }
      roomExists = true;
      roomDataRef.current = snap.val();
      rebuild();
    }, (err) => {
      if (isCleanedUp) return;
      setConnectionError(err.message);
      setIsConnecting(false);
    });

    // Track if player was ever in the room (to detect kick vs never joined)
    let wasInRoom = false;
    
    // Players listener - also updates onDisconnect behavior based on player count
    let lastConnectedCount = -1;
    let latestConnectedCount = 0; // Persists across callbacks for timeout to use
    let disconnectBehaviorTimeout: NodeJS.Timeout | null = null;
    const unsubPlayers = onValue(playersRef, (snap) => {
      if (isCleanedUp) return;
      const data = snap.val() as Record<string, PlayerData> | null;
      playersDataRef.current = data;
      
      // Detect if player was kicked: they were in the room before, but now they're not
      // (and the room still exists - checked by roomExists flag)
      const isPlayerInRoom = data ? playerId in data : false;
      if (wasInRoom && !isPlayerInRoom && roomExists) {
        // Player was removed from the room while it still exists = kicked
        setRoomClosedReason("kicked");
        return;
      }
      if (isPlayerInRoom) {
        wasInRoom = true;
      }
      
      // connected !== false treats undefined as connected (backwards compatible)
      const connected = data
        ? Object.values(data).filter((p) => p.connected !== false).length
        : 0;
      latestConnectedCount = connected; // Always update the latest value
      setConnectedPlayerCount(connected);
      rebuild();
      
      // Debounce updateDisconnectBehavior to avoid race conditions
      // When joining, Firebase may fire multiple times with partial data
      if (connected !== lastConnectedCount && playerId) {
        lastConnectedCount = connected;
        
        // Cancel any pending call - only the latest count matters
        if (disconnectBehaviorTimeout) {
          clearTimeout(disconnectBehaviorTimeout);
        }
        
        // Delay to let Firebase sync settle, use latestConnectedCount (not connected)
        // so the timeout uses the most recent value, not the stale value from schedule time
        disconnectBehaviorTimeout = setTimeout(() => {
          disconnectBehaviorTimeout = null;
          // Use latestConnectedCount which has the value from the most recent callback
          actions.updateDisconnectBehavior(roomCode, playerId, latestConnectedCount).catch((err) => {
            // Log but don't show to user - this is a background operation
            console.warn("[Room] Failed to update disconnect behavior:", err.message);
          });
        }, 200); // Increased to 200ms for more settling time
        
        // Fix race condition: Only try to reassign owner if this player could become owner
        // (i.e., they are the first connected player alphabetically by ID)
        if (data) {
          const connectedPlayerIds = Object.entries(data)
            .filter(([, p]) => p.connected !== false)
            .map(([id]) => id)
            .sort();
          
          // Only the first connected player (by ID order) should attempt reassignment
          if (connectedPlayerIds[0] === playerId) {
            // Cancel any pending reassign timeout since we're checking now
            if (ownerReassignTimeoutRef.current) {
              clearTimeout(ownerReassignTimeoutRef.current);
              ownerReassignTimeoutRef.current = null;
            }
            
            actions.reassignOwnerIfNeeded(roomCode).then((result) => {
              if (isCleanedUp) return;
              
              // If owner is disconnected but within grace period, schedule a re-check
              if (result.withinGracePeriod && result.gracePeriodRemainingMs > 0) {
                // Add a small buffer to ensure we're past the grace period
                const delay = result.gracePeriodRemainingMs + 1000;
                ownerReassignTimeoutRef.current = setTimeout(() => {
                  if (isCleanedUp) return;
                  ownerReassignTimeoutRef.current = null;
                  // Re-check - this time it should transfer if owner is still disconnected
                  actions.reassignOwnerIfNeeded(roomCode).catch((err) => {
                    console.warn("[Room] Failed to reassign owner after grace period:", err.message);
                  });
                }, delay);
              }
            }).catch((err) => {
              // Log but don't show to user - this is a background operation
              console.warn("[Room] Failed to reassign owner:", err.message);
            });
          }
        }
      }
    });

    // Messages listener (limited to last 300 - enough for spectator-heavy rooms)
    const messagesQuery = query(messagesRef, orderByChild("timestamp"), limitToLast(300));
    const unsubMessages = onValue(messagesQuery, (snap) => {
      if (isCleanedUp) return;
      setMessages(toMessages(snap.val()));
    });

    // Connection listener - restore presence after reconnection
    // When Firebase connection drops, onDisconnect marks us as disconnected.
    // When it reconnects, we need to re-mark ourselves as connected.
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (isCleanedUp) return;
      const isConnected = snap.val() === true;
      
      // Detect actual reconnection: we must have successfully joined before,
      // then disconnected, and now reconnected.
      // Skip initial connection sequence (false → true before join completes)
      const hasJoined = disconnectRefRef.current !== null;
      const isReconnection = hasJoined && wasConnectedRef.current === false && isConnected;
      
      if (isReconnection) {
        // Verify room and player still exist (might have been cleaned up while disconnected)
        const roomExists = roomDataRef.current !== null;
        const playerExists = playersDataRef.current?.[playerId] !== undefined;
        
        if (roomExists && playerExists) {
          const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
          update(playerRef, {
            connected: true,
            lastSeen: serverTimestamp(),
          }).catch((err) => {
            console.warn("[Room] Failed to restore presence after reconnection:", err.message);
          });
          
          // Re-establish onDisconnect handler after reconnection
          const currentConnected = playersDataRef.current
            ? Object.values(playersDataRef.current).filter((p) => p.connected !== false).length + 1
            : 1;
          actions.updateDisconnectBehavior(roomCode, playerId, currentConnected).catch((err) => {
            console.warn("[Room] Failed to update disconnect behavior after reconnection:", err.message);
          });
        }
        // If room/player gone, silently skip - user will see "room closed" UI anyway
      }
      
      wasConnectedRef.current = isConnected;
    });

    // Join room and set up onDisconnect
    actions.joinRoom(roomCode, playerId, playerName, playerAvatar, visibility)
      .then(({ disconnectRef }) => {
        if (isCleanedUp) return;
        disconnectRefRef.current = disconnectRef;
        setIsConnecting(false);
      })
      .catch((e) => {
        if (isCleanedUp) return;
        setConnectionError(e.message || "Failed to join");
        setIsConnecting(false);
      });

    return () => {
      // Mark as cleaned up to prevent any further state updates
      isCleanedUp = true;
      
      // Use unsubscribe functions instead of off() to avoid removing
      // other listeners on the same paths (e.g., useFirebaseConnection
      // also listens to .info/connected for the global offline indicator)
      unsubRoom();
      unsubPlayers();
      unsubMessages();
      unsubConnected();
      
      // Reset connection tracking ref
      wasConnectedRef.current = null;
      
      // Cancel any pending disconnect behavior update
      if (disconnectBehaviorTimeout) {
        clearTimeout(disconnectBehaviorTimeout);
      }
      
      // Cancel any pending owner reassignment timeout
      if (ownerReassignTimeoutRef.current) {
        clearTimeout(ownerReassignTimeoutRef.current);
        ownerReassignTimeoutRef.current = null;
      }
      
      // Delay leaveRoom to prevent false disconnections from component remounts
      // (e.g., parent context changes causing tree recreation).
      // If the component remounts quickly, the new effect will cancel this timeout.
      // The onDisconnect handler will still mark the player disconnected if they truly leave.
      leaveTimeoutRef.current = setTimeout(() => {
        if (playerId) {
          actions.leaveRoom(roomCode, playerId).catch((err) => {
            console.warn("[Room] Failed to leave room cleanly:", err.message);
          });
        }
        leaveTimeoutRef.current = null;
      }, 200);
    };
  }, [roomCode, playerName, playerAvatar, uid, authLoading]);

  return {
    gameState,
    players,
    currentPlayer,
    messages,
    isConnecting,
    connectionError,
    setConnectionError,
    connectedPlayerCount,
    roomClosedReason,
    uid,
  };
}
