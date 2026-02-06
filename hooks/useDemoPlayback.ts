"use client";

/**
 * Demo playback state machine.
 *
 * Walks through a DemoScript producing GameState / Player / cardVotes
 * that existing components (GameBoard, GameStatusPanel) can consume directly.
 * Zero Firebase dependencies — everything lives in React state.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { Card, GameState, Player } from "@/shared/types";
import {
  DEMO_SCRIPT,
  demoPlayersToPlayers,
  getDemoHinter,
  getDemoSeeker,
  getDemoPlayerById,
} from "@/shared/demo-script";
import type { DemoScript } from "@/shared/demo-script";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DemoPhase =
  | "intro"
  | "hinterThinking"
  | "clueGiven"
  | "seekerReacting"
  | "seekerVoting"
  | "cardReveal"
  | "turnEnd"
  | "gameOverReveal"
  | "gameOver";

export interface DemoThought {
  playerName: string;
  avatar: string;
  text: string;
}

export interface DemoPlaybackState {
  // Data shaped for existing game components
  gameState: GameState;
  currentPlayer: Player;
  players: Player[];

  // Demo-specific UI state
  phase: DemoPhase;
  perspective: "hinter" | "seeker";
  annotation: string | null;
  thought: DemoThought | null;
  turnIndex: number;
  totalTurns: number;
  isPlaying: boolean;
  speed: 1 | 2;
  isComplete: boolean;

  // Countdown timer: how long this step lasts (so UI can show progress)
  /** Total duration of the current phase step in ms (already speed-adjusted) */
  phaseDurationMs: number;
  /** Increments on every step change — use as a React key to restart animations */
  stepCounter: number;
}

export interface DemoPlaybackControls {
  play: () => void;
  pause: () => void;
  nextStep: () => void;
  setSpeed: (s: 1 | 2) => void;
  togglePerspective: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Phase timing (ms) — divided by speed multiplier
// ---------------------------------------------------------------------------

const PHASE_DELAYS: Record<DemoPhase, number> = {
  intro: 11000,
  hinterThinking: 9000,
  clueGiven: 5000,
  seekerReacting: 10000,
  seekerVoting: 7000,
  cardReveal: 8000,
  turnEnd: 9000,
  gameOverReveal: 10000,
  gameOver: 0, // doesn't auto-advance
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDemoPlayback(): [DemoPlaybackState, DemoPlaybackControls] {
  const script: DemoScript = DEMO_SCRIPT;
  const players = demoPlayersToPlayers(script.players);

  // ---- core playback state (render-triggering) ----
  const [phase, setPhase] = useState<DemoPhase>("intro");
  const [turnIndex, setTurnIndex] = useState(0);
  const [revealIndex, setRevealIndex] = useState(0);
  const [board, setBoard] = useState<Card[]>(() => script.board.map((c) => ({ ...c })));
  const [cardVotes, setCardVotes] = useState<Record<number, string[]>>({});
  const [currentClue, setCurrentClue] = useState<{ word: string; count: number } | null>(null);
  const [remainingGuesses, setRemainingGuesses] = useState<number | null>(null);
  const [currentTeam, setCurrentTeam] = useState<"red" | "blue">(script.startingTeam);
  const [redHasGivenClue, setRedHasGivenClue] = useState(false);
  const [blueHasGivenClue, setBlueHasGivenClue] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"red" | "blue" | null>(null);

  // demo-specific UI state
  const [annotation, setAnnotation] = useState<string | null>(script.introAnnotation);
  const [thought, setThought] = useState<DemoThought | null>(null);
  const [perspective, setPerspective] = useState<"hinter" | "seeker">("hinter");
  const [perspectiveOverride, setPerspectiveOverride] = useState<"hinter" | "seeker" | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [isComplete, setIsComplete] = useState(false);
  const [stepCounter, setStepCounter] = useState(0);

  // refs for auto-advance timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(speed);

  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // ---- helpers ----

  const resolveThought = useCallback(
    (raw: { playerId: string; text: string } | undefined): DemoThought | null => {
      if (!raw) return null;
      const p = getDemoPlayerById(script.players, raw.playerId);
      if (!p) return null;
      return { playerName: p.name, avatar: p.avatar, text: raw.text };
    },
    [script.players],
  );

  // Auto-perspective based on phase (can be overridden)
  const effectivePerspective = perspectiveOverride ?? perspective;

  // ---- timer management ----

  // Cancel previous timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Schedule next step after delay
  const scheduleNext = useCallback(
    (delayMs: number) => {
      clearTimer();
      if (!isPlayingRef.current) return;
      timerRef.current = setTimeout(() => {
        stepImperative();
      }, delayMs / speedRef.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // stepImperative is defined below and stable via ref
  );

  // ---- The actual imperative step logic ----
  // We store the step fn in a ref so scheduleNext can call it without deps.
  const stepRef = useRef<() => void>(() => {});

  function stepImperative() {
    stepRef.current();
  }

  // Build step function (re-assigned on every render to capture latest state)
  stepRef.current = () => {
    setStepCounter((c) => c + 1);
    const turn = script.turns[turnIndex];

    switch (phase) {
      // ── INTRO → hinterThinking ────────────────────────────────
      case "intro": {
        if (!turn) {
          setPhase("gameOver");
          return;
        }
        setCurrentTeam(turn.team);
        setCurrentClue(null);
        setRemainingGuesses(null);
        setCardVotes({});
        setAnnotation(null);

        const hinter = getDemoHinter(script.players, turn.team);
        setThought({
          playerName: hinter.name,
          avatar: hinter.avatar,
          text: turn.hinterThought,
        });
        setPerspective("hinter");
        setPhase("hinterThinking");
        scheduleNext(PHASE_DELAYS.hinterThinking);
        break;
      }

      // ── HINTER THINKING → clueGiven ──────────────────────────
      case "hinterThinking": {
        if (!turn) return;
        setCurrentClue(turn.clue);
        setRemainingGuesses(turn.clue.count + 1);
        setThought(null);
        setAnnotation(null);

        if (turn.team === "red") setRedHasGivenClue(true);
        else setBlueHasGivenClue(true);

        setPerspective("seeker");
        setPhase("clueGiven");
        scheduleNext(PHASE_DELAYS.clueGiven);
        break;
      }

      // ── CLUE GIVEN → seekerReacting (or seekerVoting if no reaction) ──
      case "clueGiven": {
        if (!turn) return;
        if (turn.seekerReaction) {
          // Show seeker reacting to the clue before any votes
          setThought(resolveThought(turn.seekerReaction));
          setAnnotation(null);
          setPerspective("seeker");
          setPhase("seekerReacting");
          scheduleNext(PHASE_DELAYS.seekerReacting);
        } else {
          // No reaction — go straight to first vote
          const reveal = turn.reveals[revealIndex];
          if (!reveal) {
            setPhase("turnEnd");
            scheduleNext(PHASE_DELAYS.turnEnd);
            break;
          }
          setCardVotes({ [reveal.cardIndex]: reveal.voterIds });
          setThought(resolveThought(reveal.thought));
          setAnnotation(null);
          setPerspective("seeker");
          setPhase("seekerVoting");
          scheduleNext(PHASE_DELAYS.seekerVoting);
        }
        break;
      }

      // ── SEEKER REACTING → seekerVoting ───────────────────────
      case "seekerReacting": {
        if (!turn) return;
        const reveal = turn.reveals[revealIndex];
        if (!reveal) {
          setPhase("turnEnd");
          scheduleNext(PHASE_DELAYS.turnEnd);
          break;
        }
        // Now show the first vote with per-card deliberation thought
        setCardVotes({ [reveal.cardIndex]: reveal.voterIds });
        setThought(resolveThought(reveal.thought));
        setAnnotation(null);
        setPerspective("seeker");
        setPhase("seekerVoting");
        scheduleNext(PHASE_DELAYS.seekerVoting);
        break;
      }

      // ── SEEKER VOTING → cardReveal ────────────────────────────
      case "seekerVoting": {
        if (!turn) return;
        const reveal = turn.reveals[revealIndex];
        if (!reveal) return;

        // Reveal the card
        const newBoard = board.map((c, i) =>
          i === reveal.cardIndex ? { ...c, revealed: true, revealedBy: reveal.voterIds[0] } : c,
        );
        setBoard(newBoard);
        setCardVotes({});
        setThought(null);
        setAnnotation(reveal.annotation ?? null);

        // Update remaining guesses
        const newRemaining = (remainingGuesses ?? 1) - 1;
        setRemainingGuesses(newRemaining);

        // Check if this is a winning reveal
        const revealedCard = script.board[reveal.cardIndex];
        const isCorrect = revealedCard.team === turn.team;
        const isLastRevealInTurn = revealIndex >= turn.reveals.length - 1;

        // Check for game win
        const teamCards = newBoard.filter((c) => c.team === turn.team);
        const allRevealed = teamCards.every((c) => c.revealed);

        if (allRevealed) {
          // Game over — this team wins
          setGameOver(true);
          setWinner(turn.team);
          setPhase("cardReveal");
          // Will transition to gameOver
          scheduleNext(PHASE_DELAYS.cardReveal);
        } else {
          setPhase("cardReveal");
          scheduleNext(PHASE_DELAYS.cardReveal);
        }
        break;
      }

      // ── CARD REVEAL → next reveal / turnEnd / gameOverReveal ──
      case "cardReveal": {
        if (!turn) return;

        // Check if game is over → reveal full board
        if (gameOver) {
          // Flip all remaining cards so the player can see the full board
          setBoard((prev) => prev.map((c) => ({ ...c, revealed: true })));
          setThought(null);
          setCurrentClue(null);
          setAnnotation(
            "Here's the full board! See where all the words were hiding — " +
            "and notice that SHADOW was the Trap card all along.",
          );
          setPerspective("hinter");
          setPerspectiveOverride("hinter");
          setPhase("gameOverReveal");
          scheduleNext(PHASE_DELAYS.gameOverReveal);
          break;
        }

        const isLastReveal = revealIndex >= turn.reveals.length - 1;
        const reveal = turn.reveals[revealIndex];
        const revealedCard = script.board[reveal.cardIndex];
        const isCorrect = revealedCard.team === turn.team;

        if (!isLastReveal && isCorrect) {
          // More reveals to go in this turn
          const nextRevealIdx = revealIndex + 1;
          setRevealIndex(nextRevealIdx);
          const nextReveal = turn.reveals[nextRevealIdx];
          if (nextReveal) {
            setCardVotes({ [nextReveal.cardIndex]: nextReveal.voterIds });
            setThought(resolveThought(nextReveal.thought));
            setAnnotation(null);
          }
          setPerspective("seeker");
          setPhase("seekerVoting");
          scheduleNext(PHASE_DELAYS.seekerVoting);
        } else {
          // Turn is over (wrong guess or all reveals done)
          setAnnotation(turn.turnEndAnnotation ?? null);
          setThought(null);
          setCurrentClue(null);
          setRemainingGuesses(null);
          setPhase("turnEnd");
          scheduleNext(PHASE_DELAYS.turnEnd);
        }
        break;
      }

      // ── GAME OVER REVEAL → gameOver ───────────────────────────
      case "gameOverReveal": {
        setAnnotation(script.outroAnnotation);
        setThought(null);
        setIsComplete(true);
        setPhase("gameOver");
        // Don't schedule — gameOver is the end
        break;
      }

      // ── TURN END → next turn's hinterThinking ─────────────────
      case "turnEnd": {
        const nextTurnIdx = turnIndex + 1;
        if (nextTurnIdx >= script.turns.length) {
          // No more turns — game over
          setAnnotation(script.outroAnnotation);
          setThought(null);
          setGameOver(true);
          setIsComplete(true);
          setPhase("gameOver");
          break;
        }

        const nextTurn = script.turns[nextTurnIdx];
        setTurnIndex(nextTurnIdx);
        setRevealIndex(0);
        setCurrentTeam(nextTurn.team);
        setCurrentClue(null);
        setRemainingGuesses(null);
        setCardVotes({});

        const hinter = getDemoHinter(script.players, nextTurn.team);
        setThought({
          playerName: hinter.name,
          avatar: hinter.avatar,
          text: nextTurn.hinterThought,
        });
        setAnnotation(null);
        setPerspective("hinter");
        setPhase("hinterThinking");
        scheduleNext(PHASE_DELAYS.hinterThinking);
        break;
      }

      // ── GAME OVER (terminal) ──────────────────────────────────
      case "gameOver":
        // No auto-advance from here
        break;
    }
  };

  // ---- auto-advance when isPlaying changes ----
  useEffect(() => {
    if (isPlaying && phase !== "gameOver") {
      // Kick off the timer for the current phase
      const delay = PHASE_DELAYS[phase];
      if (delay > 0) {
        scheduleNext(delay);
      }
    } else {
      clearTimer();
    }
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Start auto-play on mount
  useEffect(() => {
    if (isPlaying) {
      scheduleNext(PHASE_DELAYS.intro);
    }
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- controls ----

  const controls: DemoPlaybackControls = {
    play: useCallback(() => {
      setIsPlaying(true);
      // Schedule next step
      const delay = PHASE_DELAYS[phase] ?? 2000;
      scheduleNext(delay);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, scheduleNext]),

    pause: useCallback(() => {
      setIsPlaying(false);
      clearTimer();
    }, [clearTimer]),

    nextStep: useCallback(() => {
      clearTimer();
      stepImperative();
    }, [clearTimer]),

    setSpeed: useCallback((s: 1 | 2) => {
      setSpeed(s);
    }, []),

    togglePerspective: useCallback(() => {
      setPerspectiveOverride((prev) => {
        if (prev === null) {
          // Override to the opposite of auto perspective
          return perspective === "hinter" ? "seeker" : "hinter";
        }
        // Toggle override
        return prev === "hinter" ? "seeker" : "hinter";
      });
    }, [perspective]),

    reset: useCallback(() => {
      clearTimer();
      setPhase("intro");
      setTurnIndex(0);
      setRevealIndex(0);
      setBoard(script.board.map((c) => ({ ...c })));
      setCardVotes({});
      setCurrentClue(null);
      setRemainingGuesses(null);
      setCurrentTeam(script.startingTeam);
      setRedHasGivenClue(false);
      setBlueHasGivenClue(false);
      setGameOver(false);
      setWinner(null);
      setAnnotation(script.introAnnotation);
      setThought(null);
      setPerspective("hinter");
      setPerspectiveOverride(null);
      setIsPlaying(true);
      setIsComplete(false);
      setStepCounter(0);
      // Kick off auto-play after reset
      setTimeout(() => {
        scheduleNext(PHASE_DELAYS.intro);
      }, 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearTimer, scheduleNext, script]),
  };

  // ---- build GameState for existing components ----

  const gameState: GameState = {
    roomCode: "DEMO",
    players,
    board,
    ownerId: null,
    cardVotes,
    currentTeam,
    startingTeam: script.startingTeam,
    wordPack: ["classic"],
    customWords: [],
    currentClue,
    remainingGuesses,
    turnStartTime: null,
    timerPreset: "normal",
    redHasGivenClue,
    blueHasGivenClue,
    gameStarted: true,
    gameOver,
    winner,
    paused: false,
    pauseReason: null,
    pausedForTeam: null,
    locked: false,
    visibility: "private",
    roomName: "Demo Game",
    maxPlayers: 6,
    bannedPlayers: {},
  };

  // Current player depends on perspective
  const currentTurn = script.turns[turnIndex];
  const activeTeam = currentTurn?.team ?? script.startingTeam;

  const currentPlayer: Player =
    effectivePerspective === "hinter"
      ? (() => {
          const h = getDemoHinter(script.players, activeTeam);
          return {
            id: h.id,
            name: h.name,
            avatar: h.avatar,
            team: h.team,
            role: h.role as "clueGiver" | "guesser",
            connected: true,
            lastSeen: null,
          };
        })()
      : (() => {
          const s = getDemoSeeker(script.players, activeTeam);
          return {
            id: s.id,
            name: s.name,
            avatar: s.avatar,
            team: s.team,
            role: s.role as "clueGiver" | "guesser",
            connected: true,
            lastSeen: null,
          };
        })();

  // Phase duration adjusted for speed (0 for gameOver / when paused)
  const phaseDurationMs =
    phase === "gameOver" || !isPlaying ? 0 : PHASE_DELAYS[phase] / speed;

  const state: DemoPlaybackState = {
    gameState,
    currentPlayer,
    players,
    phase,
    perspective: effectivePerspective,
    annotation,
    thought,
    turnIndex,
    totalTurns: script.turns.length,
    isPlaying,
    speed,
    isComplete,
    phaseDurationMs,
    stepCounter,
  };

  return [state, controls];
}
