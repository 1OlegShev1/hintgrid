"use client";

/**
 * Main demo mode container.
 *
 * Wires `useDemoPlayback` to the existing GameBoard + GameStatusPanel
 * components, plus the demo-specific overlay and controls.
 * No Firebase / auth dependencies.
 */

import GameBoard from "@/components/GameBoard";
import { GameStatusPanel } from "@/components/room";
import { Card, Button, getTeamClasses, getTeamTextClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useDemoPlayback } from "@/hooks/useDemoPlayback";
import DemoOverlay from "./DemoOverlay";
import DemoControls from "./DemoControls";

interface DemoViewProps {
  onClose: () => void;
  onCreateRoom: () => void;
}

// No-op handlers for GameStatusPanel / GameBoard (demo is read-only)
const noop = () => {};

export default function DemoView({ onClose, onCreateRoom }: DemoViewProps) {
  const [state, controls] = useDemoPlayback();
  const { gameState, currentPlayer, players, phase, perspective, isComplete } = state;

  // Determine turn glow class matching the real game
  const turnGlowClass =
    gameState.currentTeam === "red"
      ? "shadow-[0_0_0_1px_rgba(239,68,68,0.25)]"
      : "shadow-[0_0_0_1px_rgba(59,130,246,0.25)]";

  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto">
      {/* Demo badge */}
      <div className="flex items-center justify-center">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Demo Mode
        </span>
      </div>

      {/* Status panel (read-only: isMyTurn=false, isRoomOwner=false, canGiveClue=false) */}
      {phase !== "intro" && (
        <GameStatusPanel
          gameState={gameState}
          timeRemaining={null}
          isMyTurn={false}
          isRoomOwner={false}
          canGiveClue={false}
          clueAnimating={phase === "clueGiven"}
          players={players}
          showGameOverOverlay={false}
          onEndTurn={noop}
          onEndGame={noop}
          onPauseGame={noop}
          onResumeGame={noop}
          onRematch={noop}
          onGiveClue={noop}
        />
      )}

      {/* Overlay: thought bubbles + annotations */}
      <DemoOverlay
        phase={phase}
        annotation={state.annotation}
        thought={state.thought}
        perspective={perspective}
      />

      {/* Game board */}
      <div className="-mx-5 sm:mx-0">
        <Card variant="elevated" padding="lg" className={cn("p-1.5! sm:p-6!", turnGlowClass)}>
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

          {/* Perspective indicator below board */}
          {currentPlayer.team && currentPlayer.role && (
            <div className="mt-3 sm:mt-4 flex justify-center">
              <div
                className={cn(
                  "inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 rounded-xl border-2 shadow-sm",
                  getTeamClasses(currentPlayer.team, "card"),
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wide hidden sm:inline",
                    getTeamTextClass(currentPlayer.team),
                  )}
                >
                  Viewing as
                </span>
                <span
                  className={cn(
                    "font-bold text-base sm:text-lg",
                    getTeamTextClass(currentPlayer.team),
                  )}
                >
                  {currentPlayer.team.toUpperCase()}{" "}
                  {currentPlayer.role === "clueGiver" ? "Hinter" : "Seeker"}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Controls bar */}
      <DemoControls state={state} controls={controls} onClose={onClose} />

      {/* End-of-demo CTA */}
      {isComplete && (
        <div className="text-center space-y-3 py-2">
          <p className="text-muted text-sm">
            Ready to play for real?
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="primary" size="lg" onClick={onCreateRoom}>
              Create a Room
            </Button>
            <Button variant="secondary" size="lg" onClick={controls.reset}>
              Watch Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
