"use client";

/**
 * Main demo mode container — full-viewport, no-scroll layout.
 *
 * Desktop (md+): two-column — board left, commentary right.
 * Mobile: stacked — controls top, board middle, commentary bottom.
 *
 * Wires `useDemoPlayback` to the existing GameBoard component
 * plus compact inline status, overlay and controls.
 * Zero Firebase / auth dependencies.
 */

import GameBoard from "@/components/GameBoard";
import { Button, getTeamClasses, getTeamTextClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useDemoPlayback } from "@/hooks/useDemoPlayback";
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

  // ---- Computed values for mini status ----
  const redTotal = gameState.board.filter((c) => c.team === "red").length;
  const blueTotal = gameState.board.filter((c) => c.team === "blue").length;
  const redRevealed = gameState.board.filter((c) => c.team === "red" && c.revealed).length;
  const blueRevealed = gameState.board.filter((c) => c.team === "blue" && c.revealed).length;

  const turnGlowClass =
    gameState.currentTeam === "red"
      ? "shadow-[0_0_0_2px_rgba(239,68,68,0.3)]"
      : "shadow-[0_0_0_2px_rgba(59,130,246,0.3)]";

  return (
    <div className="h-full flex flex-col relative z-10">
      {/* ── Top bar: controls ──────────────────────────────────── */}
      <DemoControls state={state} controls={controls} onClose={onClose} />

      {/* ── Main content: two columns on md+, stacked on mobile ── */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-6 px-4 md:px-6 py-3 min-h-0">

        {/* ── LEFT / TOP: Game Board ─────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 min-w-0">
          <div className={cn(
            "w-full max-w-2xl rounded-xl border bg-surface/50 p-2 sm:p-4",
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

        {/* ── RIGHT / BOTTOM: Status + Commentary ────────────── */}
        <div className="w-full md:w-80 lg:w-96 xl:w-[26rem] flex flex-col gap-3 min-h-0 shrink-0">

          {/* Mini status strip */}
          {phase !== "intro" && (
            <div className={cn(
              "rounded-xl border-2 px-4 py-3 space-y-2",
              gameState.currentTeam === "red"
                ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"
                : "border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30",
            )}>
              {/* Scores — two balanced columns */}
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex-1 text-center rounded-lg py-1.5 font-bold text-base",
                  gameState.currentTeam === "red" ? "bg-red-500/15 dark:bg-red-500/20" : "bg-transparent",
                  redRevealed === redTotal ? "line-through opacity-50" : "text-red-600 dark:text-red-400",
                )}>
                  Red {redRevealed}/{redTotal}
                </div>
                <div className={cn(
                  "flex-1 text-center rounded-lg py-1.5 font-bold text-base",
                  gameState.currentTeam === "blue" ? "bg-blue-500/15 dark:bg-blue-500/20" : "bg-transparent",
                  blueRevealed === blueTotal ? "line-through opacity-50" : "text-blue-600 dark:text-blue-400",
                )}>
                  Blue {blueRevealed}/{blueTotal}
                </div>
              </div>
              {/* Clue */}
              {gameState.currentClue && (
                <div className="flex items-center justify-center gap-2 text-base font-mono">
                  <span className="font-bold text-foreground uppercase tracking-wide">{gameState.currentClue.word}</span>
                  <span className="bg-foreground/10 text-foreground font-bold px-2.5 py-0.5 rounded-md text-lg">
                    {gameState.currentClue.count}
                  </span>
                  {gameState.remainingGuesses != null && (
                    <span className="text-sm text-muted">({gameState.remainingGuesses} left)</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Overlay: phase label + thoughts + annotations */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DemoOverlay
              phase={phase}
              annotation={state.annotation}
              thought={state.thought}
              perspective={perspective}
            />
          </div>

          {/* End-of-demo CTA */}
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
