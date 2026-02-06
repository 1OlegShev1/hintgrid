"use client";

/**
 * Top-bar controls for demo mode.
 * Contains: demo badge, playback (play/pause/step/speed),
 * progress, perspective toggle, close — all in one row.
 * Includes a countdown progress bar below.
 */

import { Button } from "@/components/ui";
import type { DemoPlaybackState, DemoPlaybackControls } from "@/hooks/useDemoPlayback";

interface DemoControlsProps {
  state: DemoPlaybackState;
  controls: DemoPlaybackControls;
  onClose: () => void;
}

export default function DemoControls({ state, controls, onClose }: DemoControlsProps) {
  const { phase, turnIndex, totalTurns, isPlaying, speed, perspective, isComplete, phaseDurationMs, stepCounter } = state;

  return (
    <div className="shrink-0 border-b border-border bg-surface/80 backdrop-blur-sm">
      {/* Main controls row */}
      <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 px-2 sm:px-4 md:px-6 py-1.5 sm:py-2">
        {/* Left: Demo badge + playback */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Demo badge */}
          <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Demo
          </span>

          {/* Divider */}
          <div className="hidden sm:block w-px h-5 bg-border" />

          {!isComplete ? (
            <>
              <button
                type="button"
                onClick={isPlaying ? controls.pause : controls.play}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-muted/20 transition-colors text-foreground"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={controls.nextStep}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-muted/20 transition-colors text-foreground"
                aria-label="Next step"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.3 2.84A1.5 1.5 0 002 4.11v11.78a1.5 1.5 0 002.3 1.27l7-4.411V16.5a1.5 1.5 0 001.5 1.5h1.5a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0014.3 2h-1.5a1.5 1.5 0 00-1.5 1.5v3.75L4.3 2.84z" />
                </svg>
              </button>
              {/* Speed toggle */}
              <button
                type="button"
                onClick={() => controls.setSpeed(speed === 1 ? 2 : 1)}
                className={`
                  text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition-colors
                  ${speed === 2
                    ? "bg-primary text-white"
                    : "bg-muted/20 text-muted hover:bg-muted/30"
                  }
                `}
                aria-label={`Speed: ${speed}x`}
              >
                {speed}x
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={controls.reset}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Replay
            </button>
          )}
        </div>

        {/* Center: Progress */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {phase === "intro" ? (
            <span className="text-xs sm:text-sm text-muted truncate">Introduction</span>
          ) : phase === "gameOver" || phase === "gameOverReveal" ? (
            <span className="text-xs sm:text-sm font-semibold text-foreground">Game Over!</span>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-muted whitespace-nowrap">
                Turn {turnIndex + 1}/{totalTurns}
              </span>
              <div className="hidden sm:flex gap-1">
                {Array.from({ length: totalTurns }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < turnIndex
                        ? "bg-primary"
                        : i === turnIndex
                          ? "bg-primary animate-pulse"
                          : "bg-muted/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Perspective toggle (desktop only) + close */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isComplete && phase !== "intro" && (
            <button
              type="button"
              onClick={controls.togglePerspective}
              className="hidden sm:flex items-center text-xs font-medium rounded-full overflow-hidden border border-border"
              aria-label={`Switch to ${perspective === "hinter" ? "Seeker" : "Hinter"} view`}
            >
              <span
                className={`px-2.5 py-1 transition-colors ${
                  perspective === "hinter"
                    ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                    : "bg-surface text-muted"
                }`}
              >
                Hinter
              </span>
              <span
                className={`px-2.5 py-1 transition-colors ${
                  perspective === "seeker"
                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                    : "bg-surface text-muted"
                }`}
              >
                Seeker
              </span>
            </button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            <span className="hidden sm:inline">Close</span>
            <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Countdown progress bar */}
      {phaseDurationMs > 0 && isPlaying && (
        <div className="h-1.5 w-full bg-border/30">
          <div
            key={stepCounter}
            className="h-full bg-primary rounded-r-full"
            style={{
              animation: `demo-countdown ${phaseDurationMs}ms linear forwards`,
            }}
          />
          <style>{`
            @keyframes demo-countdown {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
