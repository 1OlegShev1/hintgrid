"use client";

/**
 * Main demo mode container — full-viewport, no-scroll layout.
 *
 * Desktop (md+): two-column — board left, commentary right.
 * Mobile: board fills available space with a floating overlay at the bottom
 *         for status, thoughts, annotations, and CTA.
 *
 * Wires `useDemoPlayback` to the existing GameBoard component
 * plus compact inline status, overlay and controls.
 * Zero Firebase / auth dependencies.
 */

import { useEffect } from "react";
import GameBoard from "@/components/GameBoard";
import { Button, getTeamClasses, getTeamTextClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useDemoPlayback } from "@/hooks/useDemoPlayback";
import { useSoundContextOptional } from "@/contexts/SoundContext";
import DemoOverlay from "./DemoOverlay";
import DemoControls from "./DemoControls";

interface DemoViewProps {
  onClose: () => void;
  onCreateRoom: () => void;
}

// No-op handlers for GameBoard (demo is read-only)
const noop = () => {};

export default function DemoView({ onClose, onCreateRoom }: DemoViewProps) {
  const [state, controls] = useDemoPlayback();
  const { gameState, currentPlayer, phase, perspective, isComplete } = state;
  const sound = useSoundContextOptional();

  // Set background music track based on demo phase
  useEffect(() => {
    if (!sound) return;
    if (phase === "gameOver" || phase === "gameOverReveal") {
      sound.setMusicTrack("victory");
    } else {
      sound.setMusicTrack("game-60s");
    }
    return () => {
      sound.setMusicTrack(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "gameOver" || phase === "gameOverReveal"]);

  // ---- Computed values for mini status ----
  const redTotal = gameState.board.filter((c) => c.team === "red").length;
  const blueTotal = gameState.board.filter((c) => c.team === "blue").length;
  const redRevealed = gameState.board.filter((c) => c.team === "red" && c.revealed).length;
  const blueRevealed = gameState.board.filter((c) => c.team === "blue" && c.revealed).length;

  const turnGlowClass =
    gameState.currentTeam === "red"
      ? "shadow-[0_0_0_2px_rgba(239,68,68,0.3)]"
      : "shadow-[0_0_0_2px_rgba(59,130,246,0.3)]";

  // ---- Shared status strip JSX (rendered in both mobile overlay & desktop sidebar) ----
  const statusStripClasses = (compact: boolean) =>
    cn(
      "rounded-xl border-2 space-y-1.5",
      compact ? "px-3 py-2" : "px-4 py-3 space-y-2",
      gameState.currentTeam === "red"
        ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"
        : "border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30",
    );

  const renderStatusStrip = (compact: boolean) =>
    phase !== "intro" ? (
      <div className={statusStripClasses(compact)}>
        {/* Scores */}
        <div className={cn("flex items-center", compact ? "gap-3" : "gap-4")}>
          <div className={cn(
            "flex-1 text-center rounded-lg font-bold",
            compact ? "py-1 text-sm" : "py-1.5 text-base",
            gameState.currentTeam === "red" ? "bg-red-500/15 dark:bg-red-500/20" : "bg-transparent",
            redRevealed === redTotal ? "line-through opacity-50" : "text-red-600 dark:text-red-400",
          )}>
            Red {redRevealed}/{redTotal}
          </div>
          <div className={cn(
            "flex-1 text-center rounded-lg font-bold",
            compact ? "py-1 text-sm" : "py-1.5 text-base",
            gameState.currentTeam === "blue" ? "bg-blue-500/15 dark:bg-blue-500/20" : "bg-transparent",
            blueRevealed === blueTotal ? "line-through opacity-50" : "text-blue-600 dark:text-blue-400",
          )}>
            Blue {blueRevealed}/{blueTotal}
          </div>
        </div>
        {/* Clue */}
        {gameState.currentClue && (
          <div className={cn(
            "flex items-center justify-center gap-2 font-mono",
            compact ? "text-sm" : "text-base",
          )}>
            <span className="font-bold text-foreground uppercase tracking-wide">{gameState.currentClue.word}</span>
            <span className={cn(
              "bg-foreground/10 text-foreground font-bold rounded-md",
              compact ? "px-2 py-0.5 text-base" : "px-2.5 py-0.5 text-lg",
            )}>
              {gameState.currentClue.count}
            </span>
            {gameState.remainingGuesses != null && (
              <span className={cn("text-muted", compact ? "text-xs" : "text-sm")}>
                ({gameState.remainingGuesses} left)
              </span>
            )}
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className="h-full flex flex-col relative z-10">
      {/* ── Top bar: controls ──────────────────────────────────── */}
      <DemoControls state={state} controls={controls} onClose={onClose} />

      {/* ── MOBILE: scrollable stack ─────────────────────────── */}
      <div className="flex-1 md:hidden overflow-y-auto px-2 py-1 space-y-2">
        {/* 1. Thoughts / annotations */}
        <DemoOverlay
          phase={phase}
          annotation={state.annotation}
          thought={state.thought}
          perspective={perspective}
        />

        {/* 2. Board */}
        <div className={cn(
          "w-full rounded-xl border bg-surface/50 p-1.5",
          turnGlowClass,
        )}>
          <GameBoard
            board={gameState.board}
            currentPlayer={currentPlayer}
            cardVotes={gameState.cardVotes}
            currentPlayerId={currentPlayer.id}
            requiredVotes={1}
            canVote={false}
            onVoteCard={noop}
            onConfirmReveal={noop}
          />
        </div>

        {/* 3. Team stats */}
        {renderStatusStrip(true)}

        {/* 4. CTA */}
        {isComplete && (
          <div className="text-center space-y-2 py-2">
            <p className="text-muted text-xs">Ready to play for real?</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="primary" size="sm" onClick={onCreateRoom}>
                Create a Room
              </Button>
              <Button variant="secondary" size="sm" onClick={controls.reset}>
                Watch Again
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── DESKTOP: two-column fixed layout ─────────────────── */}
      <div className="hidden md:flex flex-1 flex-row gap-6 2xl:gap-8 px-6 2xl:px-10 py-3 min-h-0">

        {/* Board */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 min-w-0">
          <div className={cn(
            "w-full max-w-2xl xl:max-w-3xl 2xl:max-w-4xl rounded-xl border bg-surface/50 p-4",
            turnGlowClass,
          )}>
            <GameBoard
              board={gameState.board}
              currentPlayer={currentPlayer}
              cardVotes={gameState.cardVotes}
              currentPlayerId={currentPlayer.id}
              requiredVotes={1}
              canVote={false}
              onVoteCard={noop}
              onConfirmReveal={noop}
            />
          </div>

          {/* Perspective chip below board */}
          {currentPlayer.team && currentPlayer.role && (
            <div className="mt-2 flex justify-center">
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold",
                  getTeamClasses(currentPlayer.team, "card"),
                )}
              >
                <span className={getTeamTextClass(currentPlayer.team)}>
                  {currentPlayer.team.toUpperCase()}{" "}
                  {currentPlayer.role === "clueGiver" ? "Hinter" : "Seeker"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 lg:w-96 xl:w-104 2xl:w-120 flex flex-col gap-3 min-h-0 shrink-0">
          {renderStatusStrip(false)}

          <div className="flex-1 min-h-0 overflow-y-auto">
            <DemoOverlay
              phase={phase}
              annotation={state.annotation}
              thought={state.thought}
              perspective={perspective}
            />
          </div>

          {isComplete && (
            <div className="text-center space-y-3 py-3 border-t border-border">
              <p className="text-muted text-sm">Ready to play for real?</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="primary" onClick={onCreateRoom}>
                  Create a Room
                </Button>
                <Button variant="secondary" onClick={controls.reset}>
                  Watch Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
