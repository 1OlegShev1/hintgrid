import { useEffect, useRef, useState, useCallback } from "react";

interface UseIdleTimeoutOptions {
  /** Timeout in milliseconds before showing idle warning */
  timeout: number;
  /** Whether to track activity (disable during active game) */
  enabled?: boolean;
}

interface UseIdleTimeoutReturn {
  /** Whether the user has been idle past the timeout */
  isIdle: boolean;
  /** Reset the idle timer (e.g., when user confirms they're still there) */
  resetIdleTimer: () => void;
}

/**
 * Hook to detect user inactivity.
 * Tracks mouse, keyboard, touch, and scroll events.
 * Once idle, stays idle until explicitly reset (not by activity).
 */
export function useIdleTimeout({
  timeout,
  enabled = true,
}: UseIdleTimeoutOptions): UseIdleTimeoutReturn {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef = useRef(false); // Track idle state for event handlers

  // Explicit reset - called when user clicks "I'm still here"
  const resetIdleTimer = useCallback(() => {
    isIdleRef.current = false;
    setIsIdle(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        isIdleRef.current = true;
        setIsIdle(true);
      }, timeout);
    }
  }, [timeout, enabled]);

  useEffect(() => {
    if (!enabled) {
      isIdleRef.current = false;
      setIsIdle(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Activity events to track
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];

    const handleActivity = () => {
      // Don't reset if already idle - user must click button to dismiss modal
      if (isIdleRef.current) return;
      
      // Reset the timer on activity
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        isIdleRef.current = true;
        setIsIdle(true);
      }, timeout);
    };

    // Start the initial timer
    timeoutRef.current = setTimeout(() => {
      isIdleRef.current = true;
      setIsIdle(true);
    }, timeout);

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, timeout]);

  return { isIdle, resetIdleTimer };
}
