"use client";

/**
 * Educational overlay for demo mode.
 * Shows thought bubbles from bot players and annotation callouts
 * with smooth fade transitions.
 */

import { useEffect, useState } from "react";
import type { DemoThought, DemoPhase } from "@/hooks/useDemoPlayback";

interface DemoOverlayProps {
  phase: DemoPhase;
  annotation: string | null;
  thought: DemoThought | null;
  perspective: "hinter" | "seeker";
}

// Phase labels shown at the top
const PHASE_LABELS: Partial<Record<DemoPhase, string>> = {
  hinterThinking: "Hinter is thinking...",
  clueGiven: "Clue given!",
  seekerReacting: "Seekers discuss the clue...",
  seekerVoting: "Seekers are guessing",
  cardReveal: "Card revealed!",
  turnEnd: "Turn over",
  gameOverReveal: "Full board revealed!",
  gameOver: "Game over!",
};

export default function DemoOverlay({
  phase,
  annotation,
  thought,
}: DemoOverlayProps) {
  // Fade-in/out state for smooth transitions
  const [visibleAnnotation, setVisibleAnnotation] = useState(annotation);
  const [visibleThought, setVisibleThought] = useState(thought);
  const [annotationFade, setAnnotationFade] = useState(false);
  const [thoughtFade, setThoughtFade] = useState(false);

  // Transition annotation
  useEffect(() => {
    if (annotation !== visibleAnnotation) {
      setAnnotationFade(false);
      const timeout = setTimeout(() => {
        setVisibleAnnotation(annotation);
        requestAnimationFrame(() => setAnnotationFade(true));
      }, 150);
      return () => clearTimeout(timeout);
    } else {
      setAnnotationFade(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotation]);

  // Transition thought
  useEffect(() => {
    if (thought !== visibleThought) {
      setThoughtFade(false);
      const timeout = setTimeout(() => {
        setVisibleThought(thought);
        requestAnimationFrame(() => setThoughtFade(true));
      }, 150);
      return () => clearTimeout(timeout);
    } else {
      setThoughtFade(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thought]);

  const phaseLabel = PHASE_LABELS[phase];

  return (
    <div className="space-y-2 md:space-y-3">
      {/* Phase label */}
      {phaseLabel && phase !== "intro" && (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {phaseLabel}
        </span>
      )}

      {/* Thought bubble */}
      {visibleThought && (
        <div
          className={`
            transition-all duration-300 ease-out
            ${thoughtFade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
          `}
        >
          <div className="flex items-start gap-2 md:gap-3 bg-surface border border-border rounded-xl px-3 py-2 md:px-4 md:py-3 shadow-sm">
            <span className="text-xl md:text-2xl shrink-0 mt-0.5" role="img" aria-label={visibleThought.playerName}>
              {visibleThought.avatar}
            </span>
            <div className="min-w-0">
              <span className="text-xs md:text-sm font-semibold text-muted block mb-0.5">
                {visibleThought.playerName} thinks...
              </span>
              <p className="text-sm md:text-base 2xl:text-lg text-foreground leading-snug md:leading-relaxed italic">
                &ldquo;{visibleThought.text}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Annotation callout */}
      {visibleAnnotation && (
        <div
          className={`
            transition-all duration-300 ease-out
            ${annotationFade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
          `}
        >
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 md:px-4 md:py-3">
            <p className="text-sm md:text-base 2xl:text-lg text-foreground leading-snug md:leading-relaxed">
              {visibleAnnotation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
