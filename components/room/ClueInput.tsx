import { useState, useEffect, useRef, FormEvent } from "react";
import type { GameState } from "@/shared/types";
import { validateClueWord } from "@/shared/validation";
import { getClueValidationError } from "@/shared/game-utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ClueInputProps {
  gameState: GameState;
  onGiveClue: (word: string, count: number) => void;
}

export default function ClueInput({ gameState, onGiveClue }: ClueInputProps) {
  const [clueWord, setClueWord] = useState("");
  const [clueCount, setClueCount] = useState(1);
  const [clueError, setClueError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when component mounts
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const trimmed = clueWord.trim();
    if (!trimmed || clueCount < 0) return;
    
    // Validate format and profanity
    const formatValidation = validateClueWord(trimmed);
    if (!formatValidation.valid) {
      setClueError(formatValidation.error || "Invalid clue");
      return;
    }
    
    // Validate against board words
    const boardValidationError = getClueValidationError(trimmed, gameState.board.map((c) => c.word));
    if (boardValidationError) {
      setClueError(boardValidationError);
      return;
    }
    
    setClueError(null);
    onGiveClue(trimmed, clueCount);
    setClueWord("");
    setClueCount(1);
  };

  return (
    <div className="mt-4 bg-surface border-2 border-warning rounded-xl p-4 shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="font-bold text-warning">Your turn, Hinter!</span>
        <span className="text-sm text-muted">Give a one-word clue and number of related cards</span>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[160px]">
            <Input
              ref={inputRef}
              label="Clue word"
              type="text"
              value={clueWord}
              onChange={(e) => {
                setClueWord(e.target.value);
                setClueError(null); // Clear error on input
              }}
              placeholder="Enter one word..."
              data-testid="game-clue-input"
              variant={clueError ? "error" : "default"}
            />
          </div>
          <div className="pb-0.5">
            <label className="block text-xs font-medium text-muted mb-1">Count</label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setClueCount(Math.max(0, clueCount - 1))}
                disabled={clueCount <= 0}
                className="w-9 h-10 flex items-center justify-center border border-r-0 border-border rounded-l-lg bg-surface-elevated text-foreground hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-bold text-lg"
                aria-label="Decrease count"
              >
                −
              </button>
              <input
                type="number"
                min={0}
                max={9}
                value={clueCount}
                onChange={(e) => setClueCount(Math.min(9, Math.max(0, Number(e.target.value) || 0)))}
                data-testid="game-clue-count"
                className="w-12 h-10 px-1 text-center border-y border-border focus:ring-2 focus:ring-primary focus:border-primary bg-surface-elevated text-foreground font-semibold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setClueCount(Math.min(9, clueCount + 1))}
                disabled={clueCount >= 9}
                className="w-9 h-10 flex items-center justify-center border border-l-0 border-border rounded-r-lg bg-surface-elevated text-foreground hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-bold text-lg"
                aria-label="Increase count"
              >
                +
              </button>
            </div>
          </div>
          <div className="pb-0.5">
            <Button
              type="submit"
              disabled={!clueWord.trim()}
              data-testid="game-clue-btn"
              variant="warning"
              className="shadow-md"
            >
              Give Clue
            </Button>
          </div>
        </div>
        {clueError && (
          <div className="mt-2 text-sm text-error flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {clueError}
          </div>
        )}
      </form>
    </div>
  );
}
