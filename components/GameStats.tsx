"use client";

import type { Card, Player, Team } from "@/shared/types";

interface PlayerStats {
  player: Player;
  correctGuesses: number;
  wrongGuesses: number;
  trapHit: boolean;
}

interface GameStatsProps {
  board: Card[];
  players: Player[];
  winner: Team | null;
}

export default function GameStats({ board, players, winner }: GameStatsProps) {
  // Calculate stats for each guesser
  const playerStats: PlayerStats[] = players
    .filter((p) => p.role === "guesser")
    .map((player) => {
      const revealedCards = board.filter((card) => card.revealedBy === player.id);
      const correctGuesses = revealedCards.filter((card) => card.team === player.team).length;
      const wrongGuesses = revealedCards.filter(
        (card) => card.team !== player.team && card.team !== "trap"
      ).length;
      const trapHit = revealedCards.some((card) => card.team === "trap");

      return {
        player,
        correctGuesses,
        wrongGuesses,
        trapHit,
      };
    })
    .sort((a, b) => {
      // Sort by correct guesses (desc), then by wrong guesses (asc)
      if (b.correctGuesses !== a.correctGuesses) {
        return b.correctGuesses - a.correctGuesses;
      }
      return a.wrongGuesses - b.wrongGuesses;
    });

  // Get top 5 players (or all if less than 5)
  const topPlayers = playerStats.slice(0, 5);

  // Calculate team stats
  const redCards = board.filter((c) => c.team === "red");
  const blueCards = board.filter((c) => c.team === "blue");
  const redRevealed = redCards.filter((c) => c.revealed).length;
  const blueRevealed = blueCards.filter((c) => c.revealed).length;

  // Check if trap was hit
  const trapHit = board.some((c) => c.team === "trap" && c.revealed);

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0: return "🥇";
      case 1: return "🥈";
      case 2: return "🥉";
      default: return `#${index + 1}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Game Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-lg p-4 sm:p-6 text-center ${
          winner === "red" 
            ? "bg-red-team-light border-2 border-red-team" 
            : "bg-red-team-light/50 border border-red-team/30"
        }`} style={{ containerType: 'inline-size' }}>
          <div className="text-fluid-score font-bold text-red-team">
            {redRevealed}/{redCards.length}
          </div>
          <div className="text-fluid-score-label text-red-team-muted mt-1">
            Red Cards Revealed
          </div>
          {winner === "red" && (
            <div className="mt-2 sm:mt-3 text-fluid-winner font-bold text-red-team">
              🎉 🏆 Winner! 🏆 🎉
            </div>
          )}
        </div>
        <div className={`rounded-lg p-4 sm:p-6 text-center ${
          winner === "blue" 
            ? "bg-blue-team-light border-2 border-blue-team" 
            : "bg-blue-team-light/50 border border-blue-team/30"
        }`} style={{ containerType: 'inline-size' }}>
          <div className="text-fluid-score font-bold text-blue-team">
            {blueRevealed}/{blueCards.length}
          </div>
          <div className="text-fluid-score-label text-blue-team-muted mt-1">
            Blue Cards Revealed
          </div>
          {winner === "blue" && (
            <div className="mt-2 sm:mt-3 text-fluid-winner font-bold text-blue-team">
              🎉 🏆 Winner! 🏆 🎉
            </div>
          )}
        </div>
      </div>

      {/* Trap indicator */}
      {trapHit && (
        <div className="bg-trap text-trap-text rounded-lg p-3 text-center">
          <span className="text-lg">💀</span> Trap card was revealed - instant loss!
        </div>
      )}

      {/* Top Players */}
      {topPlayers.length > 0 && (
        <div className="bg-surface rounded-lg p-4">
          <h4 className="font-semibold text-foreground mb-3">
            Top Seekers
          </h4>
          <div className="space-y-2">
            {topPlayers.map((stat, index) => (
              <div
                key={stat.player.id}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  stat.player.team === "red"
                    ? "bg-red-team-light"
                    : "bg-blue-team-light"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg w-8">{getMedalEmoji(index)}</span>
                  <span className={`font-medium ${
                    stat.player.team === "red" 
                      ? "text-red-team-text" 
                      : "text-blue-team-text"
                  }`}>
                    {stat.player.name}
                  </span>
                  {stat.trapHit && (
                    <span className="text-xs bg-trap text-trap-text px-1.5 py-0.5 rounded" title="Hit the trap">
                      💀
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-success font-semibold">
                    ✓ {stat.correctGuesses}
                  </span>
                  {stat.wrongGuesses > 0 && (
                    <span className="text-error">
                      ✗ {stat.wrongGuesses}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {playerStats.length === 0 && (
            <p className="text-sm text-muted">
              No cards were revealed by seekers.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
