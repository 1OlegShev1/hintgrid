import { describe, it, expect } from "vitest";
import {
  DEMO_SCRIPT,
  DEMO_BOARD,
  DEMO_PLAYERS,
  demoPlayersToPlayers,
  getDemoHinter,
  getDemoSeeker,
  getDemoPlayerById,
} from "../demo-script";

// ============================================================================
// Board Validation
// ============================================================================

describe("DEMO_BOARD", () => {
  it("has exactly 25 cards", () => {
    expect(DEMO_BOARD).toHaveLength(25);
  });

  it("has 9 red, 8 blue, 7 neutral, 1 trap", () => {
    const counts = { red: 0, blue: 0, neutral: 0, trap: 0 };
    for (const card of DEMO_BOARD) {
      counts[card.team]++;
    }
    expect(counts).toEqual({ red: 9, blue: 8, neutral: 7, trap: 1 });
  });

  it("has no pre-revealed cards", () => {
    for (const card of DEMO_BOARD) {
      expect(card.revealed).toBe(false);
    }
  });

  it("has unique words", () => {
    const words = DEMO_BOARD.map((c) => c.word);
    expect(new Set(words).size).toBe(25);
  });

  it("all words are non-empty uppercase strings", () => {
    for (const card of DEMO_BOARD) {
      expect(card.word.length).toBeGreaterThan(0);
      expect(card.word).toBe(card.word.toUpperCase());
    }
  });
});

// ============================================================================
// Players Validation
// ============================================================================

describe("DEMO_PLAYERS", () => {
  it("has 6 players", () => {
    expect(DEMO_PLAYERS).toHaveLength(6);
  });

  it("has 3 red and 3 blue", () => {
    const red = DEMO_PLAYERS.filter((p) => p.team === "red");
    const blue = DEMO_PLAYERS.filter((p) => p.team === "blue");
    expect(red).toHaveLength(3);
    expect(blue).toHaveLength(3);
  });

  it("each team has exactly 1 clueGiver and 2 guessers", () => {
    for (const team of ["red", "blue"] as const) {
      const teamPlayers = DEMO_PLAYERS.filter((p) => p.team === team);
      const hinters = teamPlayers.filter((p) => p.role === "clueGiver");
      const seekers = teamPlayers.filter((p) => p.role === "guesser");
      expect(hinters).toHaveLength(1);
      expect(seekers).toHaveLength(2);
    }
  });

  it("all player IDs are unique", () => {
    const ids = DEMO_PLAYERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(6);
  });
});

// ============================================================================
// Script Structure Validation
// ============================================================================

describe("DEMO_SCRIPT", () => {
  it("has a valid starting team", () => {
    expect(["red", "blue"]).toContain(DEMO_SCRIPT.startingTeam);
  });

  it("has intro and outro annotations", () => {
    expect(DEMO_SCRIPT.introAnnotation.length).toBeGreaterThan(0);
    expect(DEMO_SCRIPT.outroAnnotation.length).toBeGreaterThan(0);
  });

  it("has at least 3 turns", () => {
    expect(DEMO_SCRIPT.turns.length).toBeGreaterThanOrEqual(3);
  });

  it("each turn has a valid team", () => {
    for (const turn of DEMO_SCRIPT.turns) {
      expect(["red", "blue"]).toContain(turn.team);
    }
  });

  it("each turn has a non-empty clue", () => {
    for (const turn of DEMO_SCRIPT.turns) {
      expect(turn.clue.word.length).toBeGreaterThan(0);
      expect(turn.clue.count).toBeGreaterThanOrEqual(1);
    }
  });

  it("each turn has a hinter thought", () => {
    for (const turn of DEMO_SCRIPT.turns) {
      expect(turn.hinterThought.length).toBeGreaterThan(0);
    }
  });

  it("each turn has at least one reveal step", () => {
    for (const turn of DEMO_SCRIPT.turns) {
      expect(turn.reveals.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("all reveal card indices are valid (0-24)", () => {
    for (const turn of DEMO_SCRIPT.turns) {
      for (const reveal of turn.reveals) {
        expect(reveal.cardIndex).toBeGreaterThanOrEqual(0);
        expect(reveal.cardIndex).toBeLessThan(25);
      }
    }
  });

  it("all reveal voter IDs reference existing players", () => {
    const playerIds = new Set(DEMO_PLAYERS.map((p) => p.id));
    for (const turn of DEMO_SCRIPT.turns) {
      for (const reveal of turn.reveals) {
        for (const voterId of reveal.voterIds) {
          expect(playerIds.has(voterId)).toBe(true);
        }
      }
    }
  });

  it("all thought player IDs reference existing players", () => {
    const playerIds = new Set(DEMO_PLAYERS.map((p) => p.id));
    for (const turn of DEMO_SCRIPT.turns) {
      for (const reveal of turn.reveals) {
        if (reveal.thought) {
          expect(playerIds.has(reveal.thought.playerId)).toBe(true);
        }
      }
    }
  });

  it("no card is revealed twice", () => {
    const revealed = new Set<number>();
    for (const turn of DEMO_SCRIPT.turns) {
      for (const reveal of turn.reveals) {
        expect(revealed.has(reveal.cardIndex)).toBe(false);
        revealed.add(reveal.cardIndex);
      }
    }
  });

  it("the winning team reveals all their cards by the end", () => {
    // Simulate the reveals and check the winning team has all cards revealed
    const board = DEMO_BOARD.map((c) => ({ ...c }));
    let winnerTeam: string | null = null;

    for (const turn of DEMO_SCRIPT.turns) {
      for (const reveal of turn.reveals) {
        board[reveal.cardIndex].revealed = true;
        // Check if this team has all cards revealed
        const teamCards = board.filter((c) => c.team === turn.team);
        if (teamCards.every((c) => c.revealed)) {
          winnerTeam = turn.team;
        }
      }
    }

    expect(winnerTeam).not.toBeNull();
    // Verify the winner matches the outro annotation
    expect(DEMO_SCRIPT.outroAnnotation.toLowerCase()).toContain(winnerTeam!);
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

describe("demoPlayersToPlayers", () => {
  it("converts demo players to Player type", () => {
    const players = demoPlayersToPlayers(DEMO_PLAYERS);
    expect(players).toHaveLength(6);
    for (const player of players) {
      expect(player).toHaveProperty("id");
      expect(player).toHaveProperty("name");
      expect(player).toHaveProperty("avatar");
      expect(player).toHaveProperty("team");
      expect(player).toHaveProperty("role");
      expect(player.connected).toBe(true);
    }
  });
});

describe("getDemoHinter", () => {
  it("returns the hinter for red team", () => {
    const hinter = getDemoHinter(DEMO_PLAYERS, "red");
    expect(hinter.role).toBe("clueGiver");
    expect(hinter.team).toBe("red");
  });

  it("returns the hinter for blue team", () => {
    const hinter = getDemoHinter(DEMO_PLAYERS, "blue");
    expect(hinter.role).toBe("clueGiver");
    expect(hinter.team).toBe("blue");
  });
});

describe("getDemoSeeker", () => {
  it("returns a seeker for red team", () => {
    const seeker = getDemoSeeker(DEMO_PLAYERS, "red");
    expect(seeker.role).toBe("guesser");
    expect(seeker.team).toBe("red");
  });

  it("returns a seeker for blue team", () => {
    const seeker = getDemoSeeker(DEMO_PLAYERS, "blue");
    expect(seeker.role).toBe("guesser");
    expect(seeker.team).toBe("blue");
  });
});

describe("getDemoPlayerById", () => {
  it("finds existing players", () => {
    const player = getDemoPlayerById(DEMO_PLAYERS, "demo-red-hinter");
    expect(player).toBeDefined();
    expect(player!.name).toBe("Ada");
  });

  it("returns undefined for non-existent ID", () => {
    expect(getDemoPlayerById(DEMO_PLAYERS, "nonexistent")).toBeUndefined();
  });
});
