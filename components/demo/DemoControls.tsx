"use client";

/**
 * Playback controls for demo mode.
 * Play/pause, step forward, speed toggle, progress, perspective toggle,
 * and a countdown progress bar showing time until next step.
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
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Countdown progress bar */}
      {phaseDurationMs > 0 && isPlaying && (
        <div className="h-1.5 w-full bg-border/50">
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

      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 px-4 py-3">
      {/* Left: Playback controls */}
      <div className="flex items-center gap-2">
        {!isComplete ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={isPlaying ? controls.pause : controls.play}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={controls.nextStep}
              aria-label="Next step"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4.3 2.84A1.5 1.5 0 002 4.11v11.78a1.5 1.5 0 002.3 1.27l7-4.411V16.5a1.5 1.5 0 001.5 1.5h1.5a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0014.3 2h-1.5a1.5 1.5 0 00-1.5 1.5v3.75L4.3 2.84z" />
              </svg>
            </Button>
            {/* Speed toggle */}
            <button
              type="button"
              onClick={() => controls.setSpeed(speed === 1 ? 2 : 1)}
              className={`
                text-xs font-bold px-2 py-1 rounded-md transition-colors
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
          <Button variant="secondary" size="sm" onClick={controls.reset}>
            Replay
          </Button>
        )}
      </div>

      {/* Center: Progress */}
      <div className="flex-1 flex items-center justify-center">
        {phase === "intro" ? (
          <span className="text-sm text-muted">Introduction</span>
        ) : phase === "gameOver" ? (
          <span className="text-sm font-semibold text-foreground">Game Over!</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">
              Turn {turnIndex + 1} of {totalTurns}
            </span>
            {/* Progress dots */}
            <div className="flex gap-1">
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

      {/* Right: Perspective toggle + close */}
      <div className="flex items-center gap-2">
        {!isComplete && phase !== "intro" && (
          <button
            type="button"
            onClick={controls.togglePerspective}
            className="flex items-center text-xs font-medium rounded-full overflow-hidden border border-border"
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
          Close
        </Button>
      </div>
      </div>
    </div>
  );
}
