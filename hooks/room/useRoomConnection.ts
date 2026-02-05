/**
 * Room connection hook - manages real-time subscriptions and presence.
 * Uses onDisconnect for reliable presence detection.
 * Monitors .info/connected to restore presence after reconnection.
 */

import { useEffect, useState, useRef } from "react";
import { ref, onValue, query, orderByChild, limitToLast, DatabaseReference } from "firebase/database";
import { getDatabase } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import * as actions from "@/lib/rtdb";
import { toGameState, toPlayers, toMessages, PlayerData, GameState, Player, ChatMessage, RoomClosedReason, FirebaseRoomData } from "./types";
import { DISCONNECT_BEHAVIOR_DEBOUNCE_MS, LEAVE_ROOM_DELAY_MS } from "./constants";
import { usePresenceRestore } from "./usePresenceRestore";
import { useOwnerReassignment } from "./useOwnerReassignment";

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

  // Shared refs for sub-hooks
  const roomDataRef = useRef<FirebaseRoomData | null>(null);
  const playersDataRef = useRef<Record<string, PlayerData> | null>(null);
  const disconnectRefRef = useRef<DatabaseReference | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track raw players data as state so sub-hooks can react to changes
  const [rawPlayersData, setRawPlayersData] = useState<Record<string, PlayerData> | null>(null);

  const db = getDatabase();

  // Delegate presence restoration to sub-hook
  usePresenceRestore(db, roomCode, uid, {
    disconnectRef: disconnectRefRef,
    roomData: roomDataRef,
    playersData: playersDataRef,
  });

  // Delegate owner reassignment to sub-hook
  useOwnerReassignment(roomCode, uid, rawPlayersData);

  // Main effect: join room and set up listeners
  useEffect(() => {
    // Wait for auth to be ready and all required params
    if (authLoading || !uid || !playerName || !roomCode || !playerAvatar) return;

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
      setRawPlayersData(data); // Expose to sub-hooks (useOwnerReassignment)
      
      // Detect if player was kicked: they were in the room before, but now they're not
      // (and the room still exists - checked by roomExists flag)
      const isPlayerInRoom = data ? playerId in data : false;
      if (wasInRoom && !isPlayerInRoom && roomExists) {
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
      latestConnectedCount = connected;
      setConnectedPlayerCount(connected);
      rebuild();
      
      // Debounce updateDisconnectBehavior to avoid race conditions
      // When joining, Firebase may fire multiple times with partial data
      if (connected !== lastConnectedCount && playerId) {
        lastConnectedCount = connected;
        
        if (disconnectBehaviorTimeout) {
          clearTimeout(disconnectBehaviorTimeout);
        }
        
        // Delay to let Firebase sync settle, use latestConnectedCount (not connected)
        // so the timeout uses the most recent value, not the stale value from schedule time
        disconnectBehaviorTimeout = setTimeout(() => {
          disconnectBehaviorTimeout = null;
          actions.updateDisconnectBehavior(roomCode, playerId, latestConnectedCount).catch((err) => {
            console.warn("[Room] Failed to update disconnect behavior:", err.message);
          });
        }, DISCONNECT_BEHAVIOR_DEBOUNCE_MS);
      }
    });

    // Messages listener (limited to last 300 - enough for spectator-heavy rooms)
    const messagesQuery = query(messagesRef, orderByChild("timestamp"), limitToLast(300));
    const unsubMessages = onValue(messagesQuery, (snap) => {
      if (isCleanedUp) return;
      setMessages(toMessages(snap.val()));
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
      isCleanedUp = true;
      
      unsubRoom();
      unsubPlayers();
      unsubMessages();
      
      if (disconnectBehaviorTimeout) {
        clearTimeout(disconnectBehaviorTimeout);
      }
      
      // Delay leaveRoom to prevent false disconnections from component remounts
      leaveTimeoutRef.current = setTimeout(() => {
        if (playerId) {
          actions.leaveRoom(roomCode, playerId).catch((err) => {
            console.warn("[Room] Failed to leave room cleanly:", err.message);
          });
        }
        leaveTimeoutRef.current = null;
      }, LEAVE_ROOM_DELAY_MS);
    };
  }, [roomCode, playerName, playerAvatar, uid, authLoading, db]);

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
