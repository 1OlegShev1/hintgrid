"use client";

import { useFirebaseConnection } from "@/hooks/useFirebaseConnection";

/**
 * Indicator showing Firebase connection status in navbar.
 * Shows a small badge when disconnected.
 */
export default function ConnectionIndicator() {
  const connectionState = useFirebaseConnection();

  // Don't show anything while still determining connection status or when connected
  if (connectionState !== "disconnected") {
    return null;
  }

  return (
    <div 
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-pink-900/30 text-pink-400 border border-pink-500/50 shadow-[0_0_10px_rgba(255,51,102,0.3)]"
      title="Connection lost. Trying to reconnect..."
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500 shadow-[0_0_5px_rgba(255,51,102,0.8)]"></span>
      </span>
      <span className="text-xs font-pixel hidden sm:inline">Offline</span>
    </div>
  );
}
