/**
 * Room connection hook - manages real-time subscriptions and presence.
 * Uses onDisconnect for reliable presence detection.
 */

import { useEffect, useState, useRef } from "react";
import { ref, onValue, query, orderByChild, limitToLast, off, DatabaseReference } from "firebase/database";
import { getDatabase } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import * as actions from "@/lib/rtdb-actions";
import { toGameState, toPlayers, toMessages, PlayerData, GameState, Player, ChatMessage, RoomClosedReason } from "./types";

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
  playerAvatar: string
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

  const roomDataRef = useRef<any>(null);
  const playersDataRef = useRef<Record<string, PlayerData> | null>(null);
  const disconnectRefRef = useRef<DatabaseReference | null>(null);

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

    setIsConnecting(true);
    setConnectionError(null);

    const playerId = uid;

    const roomRef = ref(db, `rooms/${roomCode}`);
    const playersRef = ref(db, `rooms/${roomCode}/players`);
    const messagesRef = ref(db, `rooms/${roomCode}/messages`);

    let roomExists = false;

    const rebuild = () => {
      const playersList = toPlayers(playersDataRef.current);
      setPlayers(playersList);
      setCurrentPlayer(playersList.find((p) => p.id === playerId) || null);
      setGameState(roomDataRef.current ? toGameState(roomCode, roomDataRef.current, playersList) : null);
    };

    // Room listener
    const unsubRoom = onValue(roomRef, (snap) => {
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
      setConnectionError(err.message);
      setIsConnecting(false);
    });

    // Players listener - also updates onDisconnect behavior based on player count
    let lastConnectedCount = -1;
    const unsubPlayers = onValue(playersRef, (snap) => {
      const data = snap.val() as Record<string, PlayerData> | null;
      playersDataRef.current = data;
      
      const connected = data
        ? Object.values(data).filter((p) => p.connected).length
        : 0;
      setConnectedPlayerCount(connected);
      rebuild();
      
      // Update onDisconnect behavior when connected count changes
      if (connected !== lastConnectedCount && playerId) {
        lastConnectedCount = connected;
        actions.updateDisconnectBehavior(roomCode, playerId, connected).catch(() => {});
        actions.reassignOwnerIfNeeded(roomCode).catch(() => {});
      }
    });

    // Messages listener (limited to last 100)
    const messagesQuery = query(messagesRef, orderByChild("timestamp"), limitToLast(100));
    const unsubMessages = onValue(messagesQuery, (snap) => {
      setMessages(toMessages(snap.val()));
    });

    // Join room and set up onDisconnect
    actions.joinRoom(roomCode, playerId, playerName, playerAvatar)
      .then(({ disconnectRef }) => {
        disconnectRefRef.current = disconnectRef;
        setIsConnecting(false);
      })
      .catch((e) => {
        setConnectionError(e.message || "Failed to join");
        setIsConnecting(false);
      });

    return () => {
      off(roomRef);
      off(playersRef);
      off(messagesRef);
      // Explicitly leave room on navigation
      if (playerId) {
        actions.leaveRoom(roomCode, playerId).catch(() => {});
      }
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
