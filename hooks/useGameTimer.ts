import { useEffect, useState, useRef } from "react";
import type { GameState } from "@/shared/types";
import { TIMER_PRESETS } from "@/shared/constants";

export interface UseGameTimerReturn {
  timeRemaining: number | null;
}

/**
 * Calculate the effective duration for the current turn phase.
 * - Clue phase (no currentClue): uses clue duration + first clue bonus if applicable
 * - Guess phase (has currentClue): uses guess duration
 */
function getEffectiveDuration(gameState: GameState): number {
  const preset = TIMER_PRESETS[gameState.timerPreset];
  
  if (!gameState.currentClue) {
    // Clue phase - hinter is thinking
    const isFirstClue = gameState.currentTeam === "red"
      ? !gameState.redHasGivenClue
      : !gameState.blueHasGivenClue;
    return preset.clue + (isFirstClue ? preset.firstClueBonus : 0);
  } else {
    // Guess phase - seekers are guessing
    return preset.guess;
  }
}

export function useGameTimer(
  gameState: GameState | null,
  onTimeout: () => void,
  options?: { shouldTriggerTimeout?: boolean }
): UseGameTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutCalledForTurnRef = useRef<number | null>(null);
  const shouldTriggerTimeout = options?.shouldTriggerTimeout ?? true;

  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Don't run timer when game is paused
    // Game over takes priority - always clear timer
    if (gameState?.gameOver) {
      setTimeRemaining(null);
      return;
    }

    if (gameState?.gameStarted && gameState.turnStartTime && !gameState.paused) {
      // Reset the timeout flag when a new turn starts
      if (timeoutCalledForTurnRef.current !== gameState.turnStartTime) {
        timeoutCalledForTurnRef.current = null;
      }

      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - gameState.turnStartTime!) / 1000);
        const effectiveDuration = getEffectiveDuration(gameState);
        const remaining = Math.max(0, effectiveDuration - elapsed);
        setTimeRemaining(remaining);
        
        // Only call onTimeout once per turn
        if (
          remaining === 0 &&
          shouldTriggerTimeout &&
          timeoutCalledForTurnRef.current !== gameState.turnStartTime
        ) {
          timeoutCalledForTurnRef.current = gameState.turnStartTime;
          onTimeout();
        }
      };

      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else if (gameState?.paused) {
      // Keep showing current time when paused (don't reset to null)
    } else {
      setTimeRemaining(null);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [
    gameState?.turnStartTime,
    gameState?.timerPreset,
    gameState?.currentClue,
    gameState?.currentTeam,
    gameState?.redHasGivenClue,
    gameState?.blueHasGivenClue,
    gameState?.gameStarted,
    gameState?.gameOver,
    gameState?.paused,
    onTimeout,
    shouldTriggerTimeout,
  ]);

  return { timeRemaining };
}
