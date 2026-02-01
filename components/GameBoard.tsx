"use client";

import { useEffect, useRef, useState, useCallback, KeyboardEvent } from "react";
import type { Card, Player, Team } from "@/shared/types";
import { MaskIcon, TrapIcon, DustCloudIcon } from "@/components/icons/CardBackIcons";
import { useSoundContextOptional } from "@/contexts/SoundContext";

interface GameBoardProps {
  board: Card[];
  currentPlayer: Player | null;
  currentTeam: Team;
  cardVotes: Record<number, string[]>;
  currentPlayerId: string | null;
  requiredVotes: number;
  canVote: boolean;
  onVoteCard: (index: number) => void;
  onConfirmReveal: (index: number) => void;
}

const GRID_COLS = 5;
const GRID_ROWS = 5;

export default function GameBoard({
  board,
  currentPlayer,
  currentTeam,
  cardVotes,
  currentPlayerId,
  requiredVotes,
  canVote,
  onVoteCard,
  onConfirmReveal,
}: GameBoardProps) {
  const isClueGiver = currentPlayer?.role === "clueGiver";
  const soundContext = useSoundContextOptional();
  
  // Track previous revealed state for sound effects
  const prevRevealedRef = useRef<boolean[]>([]);
  
  // Track vote counts for badge animation
  const prevVotesRef = useRef<Record<number, number>>({});
  const [animatingBadges, setAnimatingBadges] = useState<Set<number>>(new Set());

  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (focusedIndex === null) {
      // If no card is focused, focus the first one on any arrow key
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setFocusedIndex(0);
        cardRefs.current[0]?.focus();
      }
      return;
    }

    const row = Math.floor(focusedIndex / GRID_COLS);
    const col = focusedIndex % GRID_COLS;
    let newIndex = focusedIndex;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        newIndex = row > 0 ? focusedIndex - GRID_COLS : focusedIndex;
        break;
      case "ArrowDown":
        e.preventDefault();
        newIndex = row < GRID_ROWS - 1 ? focusedIndex + GRID_COLS : focusedIndex;
        break;
      case "ArrowLeft":
        e.preventDefault();
        newIndex = col > 0 ? focusedIndex - 1 : focusedIndex;
        break;
      case "ArrowRight":
        e.preventDefault();
        newIndex = col < GRID_COLS - 1 ? focusedIndex + 1 : focusedIndex;
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (canVote && !board[focusedIndex]?.revealed) {
          onVoteCard(focusedIndex);
        }
        break;
      default:
        return;
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      cardRefs.current[newIndex]?.focus();
    }
  }, [focusedIndex, canVote, board, onVoteCard]);

  // Detect newly revealed cards and play sound
  useEffect(() => {
    const prevRevealed = prevRevealedRef.current;
    
    board.forEach((card, index) => {
      if (card.revealed && prevRevealed[index] === false) {
        soundContext?.playSound("cardReveal");
      }
    });
    
    prevRevealedRef.current = board.map(c => c.revealed);
  }, [board, soundContext]);

  // Detect vote changes for badge animation
  useEffect(() => {
    const prevVotes = prevVotesRef.current;
    const newAnimating: number[] = [];
    
    Object.entries(cardVotes).forEach(([indexStr, votes]) => {
      const index = Number(indexStr);
      const prevCount = prevVotes[index] ?? 0;
      if (votes.length > prevCount) {
        newAnimating.push(index);
      }
    });
    
    if (newAnimating.length > 0) {
      setAnimatingBadges(prev => {
        const next = new Set(prev);
        newAnimating.forEach(i => next.add(i));
        return next;
      });
      
      // Remove animation class after animation completes
      setTimeout(() => {
        setAnimatingBadges(prev => {
          const next = new Set(prev);
          newAnimating.forEach(i => next.delete(i));
          return next;
        });
      }, 300);
    }
    
    prevVotesRef.current = Object.fromEntries(
      Object.entries(cardVotes).map(([k, v]) => [k, v.length])
    );
  }, [cardVotes]);

  // Front face color (unrevealed card - what guessers/clue givers see)
  const getFrontFaceColor = useCallback((card: Card) => {
    if (!isClueGiver) {
      // Guesser view - neutral surface with border
      return "bg-surface-elevated text-foreground border-2 border-border";
    }

    // Clue giver view - colored hints
    switch (card.team) {
      case "red":
        return "bg-red-team-light border-2 border-red-team text-red-team-text";
      case "blue":
        return "bg-blue-team-light border-2 border-blue-team text-blue-team-text";
      case "trap":
        return "bg-trap border-2 border-muted text-trap-text";
      default:
        return "bg-neutral-card/30 border-2 border-neutral-card text-neutral-card-text";
    }
  }, [isClueGiver]);

  // Back face color (revealed card)
  const getBackFaceColor = useCallback((card: Card) => {
    switch (card.team) {
      case "red":
        return "card-texture-red";
      case "blue":
        return "card-texture-blue";
      case "trap":
        return "card-texture-trap";
      default:
        return "card-texture-neutral";
    }
  }, []);

  // Memoize icon color (static function, no dependencies)
  const getCardBackIconColor = useCallback((card: Card) => {
    switch (card.team) {
      case "red":
        return "text-white/40";
      case "blue":
        return "text-white/40";
      case "trap":
        return "text-muted/50";
      default:
        return "text-neutral-card-text/50";
    }
  }, []);

  // Memoize icon rendering
  const renderCardBackIcon = useCallback((card: Card) => {
    const iconClass = `w-3/5 h-3/5 opacity-50 ${getCardBackIconColor(card)}`;
    switch (card.team) {
      case "red":
      case "blue":
        return <MaskIcon className={iconClass} />;
      case "trap":
        return <TrapIcon className={iconClass} />;
      default:
        return <DustCloudIcon className={iconClass} />;
    }
  }, [getCardBackIconColor]);

  return (
    <div 
      className="game-board-grid grid grid-cols-5 gap-2 max-w-2xl mx-auto"
      onKeyDown={handleKeyDown}
      role="grid"
      aria-label="Game board"
    >
      {board.map((card, index) => {
        const votes = cardVotes[index] ?? [];
        const hasVoted = currentPlayerId ? votes.includes(currentPlayerId) : false;
        const canConfirm = canVote && requiredVotes > 0 && votes.length >= requiredVotes && hasVoted;
        const isBadgeAnimating = animatingBadges.has(index);
        const isFocused = focusedIndex === index;

        return (
          <div key={index} className="relative" role="gridcell">
            <button
              ref={(el) => { cardRefs.current[index] = el; }}
              onClick={() => !card.revealed && canVote && onVoteCard(index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              disabled={card.revealed || !canVote}
              tabIndex={canVote && !card.revealed ? 0 : -1}
              data-testid={`board-card-${index}`}
              aria-label={`${card.revealed ? `Revealed: ${card.team}` : card.word}${hasVoted ? ", you voted" : ""}${votes.length > 0 ? `, ${votes.length} votes` : ""}`}
              className={`
                card-flip-container aspect-square rounded-lg font-semibold w-full
                ${card.revealed || !canVote
                  ? "cursor-default"
                  : "cursor-pointer hover:scale-105 active:scale-95"
                }
                ${hasVoted ? `ring-2 ${currentTeam === "red" ? "ring-red-team" : "ring-blue-team"}` : ""}
                ${isFocused && !card.revealed ? "ring-2 ring-warning ring-offset-2" : ""}
                focus:outline-none focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2
                transition-transform duration-200
              `}
            >
              <div className={`card-flip-inner ${card.revealed ? "flipped" : ""}`}>
                {/* Front face - the word */}
                <div className={`card-flip-front p-1 sm:p-2 ${getFrontFaceColor(card)}`}>
                  <span className="card-text">{card.word}</span>
                </div>
                {/* Back face - revealed card */}
                <div className={`card-flip-back ${getBackFaceColor(card)}`}>
                  {renderCardBackIcon(card)}
                </div>
              </div>
            </button>
            {votes.length > 0 && !card.revealed && (
              <div 
                className={`absolute top-1 left-1 z-10 ${currentTeam === "red" ? "bg-red-team" : "bg-blue-team"} text-white text-xs px-2 py-0.5 rounded-full font-semibold ${isBadgeAnimating ? "badge-pop" : ""}`}
                title={`Votes: ${votes.length}`}
                aria-hidden="true"
              >
                {votes.length}
              </div>
            )}
            {hasVoted && !card.revealed && (
              <div className={`absolute top-1 right-1 z-10 ${currentTeam === "red" ? "bg-red-team" : "bg-blue-team"} text-white text-xs px-1.5 py-0.5 rounded`} title="You voted" aria-hidden="true">
                ✓
              </div>
            )}
            {canConfirm && !card.revealed && (
              <button
                onClick={() => onConfirmReveal(index)}
                data-testid={`board-reveal-${index}`}
                className="absolute bottom-1 right-1 z-10 bg-success text-success-foreground text-xs px-2 py-1 rounded hover:opacity-90 font-semibold shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                title="Click to reveal this card"
                aria-label={`Reveal ${card.word}`}
              >
                Reveal
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
