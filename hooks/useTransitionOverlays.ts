import { useEffect, useState, useRef, useCallback } from "react";
import type { GameState } from "@/shared/types";
import { useSoundContextOptional, SoundName } from "@/contexts/SoundContext";

export interface UseTransitionOverlaysReturn {
  showGameStart: boolean;
  showTurnChange: boolean;
  showGameOver: boolean;
  transitionTeam: "red" | "blue" | null;
  clueAnimating: boolean;
  dismissGameStart: () => void;
  dismissTurnChange: () => void;
  dismissGameOver: () => void;
}

export function useTransitionOverlays(
  gameState: GameState | null
): UseTransitionOverlaysReturn {
  const soundContext = useSoundContextOptional();
  
  const [showGameStart, setShowGameStart] = useState(false);
  const [showTurnChange, setShowTurnChange] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [transitionTeam, setTransitionTeam] = useState<"red" | "blue" | null>(null);
  const [clueAnimating, setClueAnimating] = useState(false);
  
  // Refs for tracking state changes - use primitive values for comparison
  const prevGameStartedRef = useRef<boolean | null>(null);
  const prevCurrentTeamRef = useRef<string | null>(null);
  const prevGameOverRef = useRef<boolean | null>(null);
  const prevClueRef = useRef<string | null>(null);
  const clueAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track which sounds have been played to prevent duplicates
  // Key format: "soundName:gameStateIdentifier"
  const playedSoundsRef = useRef<Set<string>>(new Set());

  // Stable play sound function that checks for duplicates
  const playSoundOnce = useCallback((name: SoundName, stateKey: string) => {
    const key = `${name}:${stateKey}`;
    if (playedSoundsRef.current.has(key)) {
      return; // Already played this sound for this state
    }
    playedSoundsRef.current.add(key);
    soundContext?.playSound(name);
  }, [soundContext]);

  // Extract primitive values from gameState to use as stable dependencies
  const gameStarted = gameState?.gameStarted ?? false;
  const currentTeam = gameState?.currentTeam ?? null;
  const gameOver = gameState?.gameOver ?? false;
  const winner = gameState?.winner ?? null;
  const startingTeam = gameState?.startingTeam ?? null;
  const currentClueWord = gameState?.currentClue?.word ?? null;
  const turnStartTime = gameState?.turnStartTime ?? null;

  useEffect(() => {
    if (!gameState) return;
    
    // On first load, initialize refs without triggering transitions
    // This prevents splash screens on page refresh when game is already in progress
    const isFirstLoad = prevGameStartedRef.current === null;
    if (isFirstLoad) {
      prevGameStartedRef.current = gameStarted;
      prevCurrentTeamRef.current = currentTeam;
      prevGameOverRef.current = gameOver;
      prevClueRef.current = currentClueWord;
      return;
    }
    
    // Game Start transition
    if (gameStarted && !prevGameStartedRef.current) {
      if (startingTeam === "red" || startingTeam === "blue") {
        setTransitionTeam(startingTeam);
        setShowGameStart(true);
        // Use turnStartTime as unique identifier for this game start
        playSoundOnce("gameStart", `start:${turnStartTime}`);
      }
    }
    
    // Turn Change transition (only after game has started, not on initial start)
    if (
      gameStarted && 
      prevGameStartedRef.current && 
      currentTeam !== prevCurrentTeamRef.current &&
      prevCurrentTeamRef.current !== null &&
      !gameOver
    ) {
      if (currentTeam === "red" || currentTeam === "blue") {
        setTransitionTeam(currentTeam);
        setShowTurnChange(true);
        // Use turnStartTime as unique identifier for this turn change
        playSoundOnce("turnChange", `turn:${turnStartTime}`);
      }
    }
    
    // Game Over transition
    if (gameOver && !prevGameOverRef.current) {
      if (winner === "red" || winner === "blue") {
        // Dismiss any other overlays first
        setShowTurnChange(false);
        setShowGameStart(false);
        // Show game over
        setTransitionTeam(winner);
        setShowGameOver(true);
        // Use winner + timestamp as unique identifier
        playSoundOnce("gameOver", `over:${winner}:${Date.now()}`);
      }
    }
    
    // Clue announcement animation (with cleanup) and sound
    if (currentClueWord && currentClueWord !== prevClueRef.current) {
      setClueAnimating(true);
      // Play clue submit sound - use clue word + turnStartTime as unique identifier
      playSoundOnce("clueSubmit", `clue:${currentClueWord}:${turnStartTime}`);
      if (clueAnimationTimeoutRef.current) {
        clearTimeout(clueAnimationTimeoutRef.current);
      }
      clueAnimationTimeoutRef.current = setTimeout(() => setClueAnimating(false), 400);
    }
    
    // Update refs AFTER all comparisons
    prevGameStartedRef.current = gameStarted;
    prevCurrentTeamRef.current = currentTeam;
    prevGameOverRef.current = gameOver;
    prevClueRef.current = currentClueWord;
  }, [gameState, gameStarted, currentTeam, gameOver, winner, startingTeam, currentClueWord, turnStartTime, playSoundOnce]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clueAnimationTimeoutRef.current) {
        clearTimeout(clueAnimationTimeoutRef.current);
      }
    };
  }, []);

  return {
    showGameStart,
    showTurnChange,
    showGameOver,
    transitionTeam,
    clueAnimating,
    dismissGameStart: () => setShowGameStart(false),
    dismissTurnChange: () => setShowTurnChange(false),
    dismissGameOver: () => setShowGameOver(false),
  };
}
