"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Howler } from "howler";

// Session storage key for audio unlock state (survives page reloads within session)
const SESSION_AUDIO_UNLOCKED_KEY = "hintgrid_audio_unlocked";

/**
 * Attempt to resume the Web Audio context.
 * Returns true if audio context is ready to play, false otherwise.
 * 
 * Note: This may fail without a user gesture on the current page.
 * Browsers require a fresh gesture after each full page load.
 */
async function tryResumeAudioContext(): Promise<boolean> {
  const ctx = Howler.ctx;
  
  // No context yet - Howler hasn't been initialized
  if (!ctx) {
    return false;
  }
  
  // Already running - good to go
  if (ctx.state === "running") {
    return true;
  }
  
  // Context is closed - can't resume
  if (ctx.state === "closed") {
    return false;
  }
  
  // Suspended - try to resume
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
      // After resume, check state again (AudioContext.state is a getter that reflects current state)
      return (ctx as AudioContext).state === "running";
    } catch {
      // Resume failed - needs user gesture
      return false;
    }
  }
  
  return false;
}

// Check sessionStorage synchronously for SSR safety
function getInitialAudioUnlocked(): boolean {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(SESSION_AUDIO_UNLOCKED_KEY) === "true";
  }
  return false;
}

export interface AudioUnlockState {
  /** Whether user has previously unlocked audio (persisted in sessionStorage) */
  hasUserIntent: boolean;
  /** Whether audio context is ready to play on THIS page load */
  isReady: boolean;
  /** Trigger value that increments when audio becomes ready (for effect dependencies) */
  unlockTrigger: number;
  /** Attempt to unlock audio context - useful when setting a track */
  tryUnlock: () => Promise<boolean>;
}

/**
 * Hook to manage browser audio autoplay policy compliance.
 * 
 * Browsers require a user gesture on each page load to unlock audio playback.
 * This hook:
 * - Tracks user intent in sessionStorage (survives page reloads)
 * - Sets up event listeners for first interaction
 * - Provides `isReady` state for conditional playback
 * - Provides `unlockTrigger` to force effect re-runs after unlock
 * 
 * @example
 * const { isReady, unlockTrigger, tryUnlock } = useAudioUnlock();
 * 
 * useEffect(() => {
 *   if (!isReady) return;
 *   // Play audio here
 * }, [track, isReady, unlockTrigger]);
 */
export function useAudioUnlock(): AudioUnlockState {
  const [hasUserIntent, setHasUserIntent] = useState(getInitialAudioUnlocked);
  const [isReady, setIsReady] = useState(false);
  const [unlockTrigger, setUnlockTrigger] = useState(0);
  
  // Ref to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Ref to track if we've already unlocked on this page load (prevents double-triggering)
  const hasUnlockedRef = useRef(false);

  // Helper to mark audio as ready (only triggers once per page load)
  const markReady = useCallback(() => {
    if (isMountedRef.current && !hasUnlockedRef.current) {
      hasUnlockedRef.current = true;
      setIsReady(true);
      setUnlockTrigger(prev => prev + 1);
    }
  }, []);

  // Attempt to unlock - returns true if successful
  const tryUnlock = useCallback(async (): Promise<boolean> => {
    // Already unlocked - just return true
    if (hasUnlockedRef.current) {
      return true;
    }
    
    const success = await tryResumeAudioContext();
    if (success) {
      markReady();
    }
    return success;
  }, [markReady]);

  // Set up event listeners for first user interaction
  useEffect(() => {
    isMountedRef.current = true;
    
    // Try immediate resume (may work if user recently interacted)
    tryResumeAudioContext().then(success => {
      if (success) {
        markReady();
      }
    });

    const events = ["click", "touchstart", "keydown"] as const;
    
    const handleInteraction = async () => {
      // Persist to sessionStorage so we know music should auto-play on future pages
      sessionStorage.setItem(SESSION_AUDIO_UNLOCKED_KEY, "true");
      setHasUserIntent(true);
      
      // Actually unlock the audio context (requires user gesture)
      const success = await tryResumeAudioContext();
      if (success) {
        markReady();
      }
      
      // Remove listeners after first successful interaction
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
    
    events.forEach(event => {
      document.addEventListener(event, handleInteraction);
    });
    
    return () => {
      isMountedRef.current = false;
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [markReady]);

  return {
    hasUserIntent,
    isReady,
    unlockTrigger,
    tryUnlock,
  };
}
