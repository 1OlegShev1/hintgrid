/**
 * Hook for monitoring Firebase Realtime Database connection status.
 * Uses Firebase's .info/connected path for real-time connection monitoring.
 */

import { useState, useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { getDatabase } from "@/lib/firebase";

export type ConnectionState = "connected" | "disconnected" | "unknown";

export function useFirebaseConnection(): ConnectionState {
  const [connectionState, setConnectionState] = useState<ConnectionState>("unknown");
  const hasEverConnected = useRef(false);

  useEffect(() => {
    const db = getDatabase();
    if (!db) {
      setConnectionState("disconnected");
      return;
    }

    // Firebase special path that indicates connection status
    const connectedRef = ref(db, ".info/connected");
    
    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        hasEverConnected.current = true;
        setConnectionState("connected");
      } else {
        // Only show "disconnected" if we were previously connected
        // This prevents the flash on initial page load
        if (hasEverConnected.current) {
          setConnectionState("disconnected");
        }
        // Otherwise stay "unknown" until we connect
      }
    });

    return () => unsubscribe();
  }, []);

  return connectionState;
}
