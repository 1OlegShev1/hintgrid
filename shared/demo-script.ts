/**
 * Demo Mode Script
 *
 * A hand-crafted game scenario used to showcase HintGrid to new users.
 * Entirely client-side -- no Firebase dependencies.
 *
 * Board layout (5x5):
 *  0: WHALE (red)     1: ROCKET (blue)   2: BANK (neutral)    3: FIRE (red)      4: STAR (blue)
 *  5: GLASS (blue)    6: REEF (red)      7: CHAIR (neutral)   8: TORCH (red)     9: MOON (blue)
 * 10: PAPER (neutral) 11: DRAGON (red)  12: SHADOW (trap)    13: PILOT (blue)   14: CASTLE (red)
 * 15: LOG (neutral)   16: MIRROR (blue) 17: DIAMOND (blue)   18: KNIGHT (red)   19: BELL (neutral)
 * 20: CROWN (red)     21: SPRING (neut) 22: ICE (blue)       23: OCEAN (red)    24: TABLE (neutral)
 *
 * Red (9): WHALE, REEF, OCEAN, FIRE, TORCH, DRAGON, CASTLE, KNIGHT, CROWN
 * Blue (8): ROCKET, STAR, GLASS, MOON, PILOT, MIRROR, DIAMOND, ICE
 * Neutral (7): BANK, CHAIR, PAPER, LOG, BELL, SPRING, TABLE
 * Trap (1): SHADOW
 */

import type { Team, Card, Player, Role } from "./types";

// ---------------------------------------------------------------------------
// Demo-specific types
// ---------------------------------------------------------------------------

export interface DemoPlayer {
  id: string;
  name: string;
  avatar: string;
  team: "red" | "blue";
  role: Role;
}

export interface DemoRevealStep {
  /** Index into the 25-card board */
  cardIndex: number;
  /** IDs of seekers who vote on this card (shown sequentially) */
  voterIds: string[];
  /** Educational callout shown during/after reveal */
  annotation?: string;
  /** Thought bubble from a specific player */
  thought?: { playerId: string; text: string };
}

export interface DemoTurn {
  team: "red" | "blue";
  clue: { word: string; count: number };
  /** Hinter's internal reasoning shown as a thought bubble */
  hinterThought: string;
  /** Reveal steps for this turn */
  reveals: DemoRevealStep[];
  /** Annotation shown when the turn ends (e.g. wrong guess explanation) */
  turnEndAnnotation?: string;
}

export interface DemoScript {
  board: Card[];
  players: DemoPlayer[];
  startingTeam: "red" | "blue";
  turns: DemoTurn[];
  introAnnotation: string;
  outroAnnotation: string;
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export const DEMO_PLAYERS: DemoPlayer[] = [
  // Red team
  { id: "demo-red-hinter", name: "Ada", avatar: "🦉", team: "red", role: "clueGiver" },
  { id: "demo-red-seeker-1", name: "Bob", avatar: "🐙", team: "red", role: "guesser" },
  { id: "demo-red-seeker-2", name: "Clara", avatar: "🦋", team: "red", role: "guesser" },
  // Blue team
  { id: "demo-blue-hinter", name: "Eve", avatar: "🦊", team: "blue", role: "clueGiver" },
  { id: "demo-blue-seeker-1", name: "Max", avatar: "🐺", team: "blue", role: "guesser" },
  { id: "demo-blue-seeker-2", name: "Luna", avatar: "🐱", team: "blue", role: "guesser" },
];

// ---------------------------------------------------------------------------
// Board  (25 cards, pre-assigned teams)
// ---------------------------------------------------------------------------

const boardData: Array<{ word: string; team: Team }> = [
  /* 0  */ { word: "WHALE",   team: "red" },
  /* 1  */ { word: "ROCKET",  team: "blue" },
  /* 2  */ { word: "BANK",    team: "neutral" },
  /* 3  */ { word: "FIRE",    team: "red" },
  /* 4  */ { word: "STAR",    team: "blue" },
  /* 5  */ { word: "GLASS",   team: "blue" },
  /* 6  */ { word: "REEF",    team: "red" },
  /* 7  */ { word: "CHAIR",   team: "neutral" },
  /* 8  */ { word: "TORCH",   team: "red" },
  /* 9  */ { word: "MOON",    team: "blue" },
  /* 10 */ { word: "PAPER",   team: "neutral" },
  /* 11 */ { word: "DRAGON",  team: "red" },
  /* 12 */ { word: "SHADOW",  team: "trap" },
  /* 13 */ { word: "PILOT",   team: "blue" },
  /* 14 */ { word: "CASTLE",  team: "red" },
  /* 15 */ { word: "LOG",     team: "neutral" },
  /* 16 */ { word: "MIRROR",  team: "blue" },
  /* 17 */ { word: "DIAMOND", team: "blue" },
  /* 18 */ { word: "KNIGHT",  team: "red" },
  /* 19 */ { word: "BELL",    team: "neutral" },
  /* 20 */ { word: "CROWN",   team: "red" },
  /* 21 */ { word: "SPRING",  team: "neutral" },
  /* 22 */ { word: "ICE",     team: "blue" },
  /* 23 */ { word: "OCEAN",   team: "red" },
  /* 24 */ { word: "TABLE",   team: "neutral" },
];

export const DEMO_BOARD: Card[] = boardData.map((c) => ({
  word: c.word,
  team: c.team,
  revealed: false,
}));

// ---------------------------------------------------------------------------
// Turns
// ---------------------------------------------------------------------------

/**
 * Scripted game flow (Red starts, 5 turns, Red wins):
 *
 * Turn 1 (Red)  – "DEEP 3"     → WHALE ✓, REEF ✓, OCEAN ✓        (Red 3/9)
 * Turn 2 (Blue) – "NIGHT 2"    → STAR ✓, BELL ✗ (neutral)        (Blue 1/8)
 * Turn 3 (Red)  – "MEDIEVAL 3" → CASTLE ✓, KNIGHT ✓, DRAGON ✓    (Red 6/9)
 * Turn 4 (Blue) – "FLIGHT 3"   → ROCKET ✓, PILOT ✓, MOON ✓      (Blue 4/8)
 * Turn 5 (Red)  – "OLYMPIC 2"  → TORCH ✓, FIRE ✓, bonus: CROWN  → Red wins!
 */

const DEMO_TURNS: DemoTurn[] = [
  // ── Turn 1: Red ──────────────────────────────────────────────
  {
    team: "red",
    clue: { word: "DEEP", count: 3 },
    hinterThought:
      "WHALE, REEF, and OCEAN are all related to the deep sea... I'll say DEEP 3!",
    reveals: [
      {
        cardIndex: 0, // WHALE
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-1",
          text: "WHALE is definitely deep sea. Let's go!",
        },
        annotation: "Seekers vote together and reveal WHALE — correct! It's a Red card.",
      },
      {
        cardIndex: 6, // REEF
        voterIds: ["demo-red-seeker-2", "demo-red-seeker-1"],
        thought: {
          playerId: "demo-red-seeker-2",
          text: "REEF is found deep underwater too. I'm confident.",
        },
        annotation: "Another correct guess! Two down, one to go.",
      },
      {
        cardIndex: 23, // OCEAN
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-1",
          text: "OCEAN has to be the third one — it's the deepest of all!",
        },
        annotation:
          "Three for three! A perfect turn. The clue number (3) means up to 3+1 guesses, but Red is happy to stop here.",
      },
    ],
  },

  // ── Turn 2: Blue ─────────────────────────────────────────────
  {
    team: "blue",
    clue: { word: "NIGHT", count: 2 },
    hinterThought:
      "STAR and MOON both shine at night. Hopefully they don't pick SHADOW...",
    reveals: [
      {
        cardIndex: 4, // STAR
        voterIds: ["demo-blue-seeker-1", "demo-blue-seeker-2"],
        thought: {
          playerId: "demo-blue-seeker-1",
          text: "Stars come out at night — easy pick!",
        },
        annotation: "STAR is Blue — nice start!",
      },
      {
        cardIndex: 19, // BELL (neutral)
        voterIds: ["demo-blue-seeker-2"],
        thought: {
          playerId: "demo-blue-seeker-2",
          text: "A bell ringing at night? Maybe like a midnight bell?",
        },
        annotation:
          "BELL is Neutral! When you reveal a neutral card, your turn ends immediately. The correct pick was MOON.",
      },
    ],
    turnEndAnnotation:
      "Wrong guess! Blue's turn is over. A wrong guess (neutral or opponent card) ends your turn right away.",
  },

  // ── Turn 3: Red ──────────────────────────────────────────────
  {
    team: "red",
    clue: { word: "MEDIEVAL", count: 3 },
    hinterThought:
      "CASTLE, KNIGHT, and DRAGON are all medieval. SHADOW is close to the trap — I hope they avoid it!",
    reveals: [
      {
        cardIndex: 14, // CASTLE
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-2",
          text: "A medieval CASTLE — that's an obvious one!",
        },
        annotation: "CASTLE is Red! Great start to the turn.",
      },
      {
        cardIndex: 18, // KNIGHT
        voterIds: ["demo-red-seeker-2", "demo-red-seeker-1"],
        thought: {
          playerId: "demo-red-seeker-1",
          text: "KNIGHT fits perfectly. Medieval knights in shining armor!",
        },
        annotation: "KNIGHT is Red too! Two for two.",
      },
      {
        cardIndex: 11, // DRAGON
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-2",
          text: "DRAGON or SHADOW? Dragons are definitely medieval... SHADOW feels risky. Let's go DRAGON.",
        },
        annotation:
          "DRAGON is Red! Smart choice — SHADOW is actually the Trap card. Revealing the trap means instant loss!",
      },
    ],
  },

  // ── Turn 4: Blue ─────────────────────────────────────────────
  {
    team: "blue",
    clue: { word: "FLIGHT", count: 3 },
    hinterThought:
      "ROCKET, PILOT, and MOON are all related to flight. Three big picks to catch up!",
    reveals: [
      {
        cardIndex: 1, // ROCKET
        voterIds: ["demo-blue-seeker-1", "demo-blue-seeker-2"],
        thought: {
          playerId: "demo-blue-seeker-1",
          text: "A ROCKET is the ultimate flying machine!",
        },
        annotation: "ROCKET is Blue! Blue team is catching up.",
      },
      {
        cardIndex: 13, // PILOT
        voterIds: ["demo-blue-seeker-2", "demo-blue-seeker-1"],
        thought: {
          playerId: "demo-blue-seeker-2",
          text: "A PILOT flies planes — great match for FLIGHT.",
        },
        annotation: "PILOT is Blue! Two in a row.",
      },
      {
        cardIndex: 9, // MOON
        voterIds: ["demo-blue-seeker-1", "demo-blue-seeker-2"],
        thought: {
          playerId: "demo-blue-seeker-1",
          text: "Astronauts flew to the MOON — flight to the moon!",
        },
        annotation:
          "MOON is Blue! Perfect turn — Blue now has 4 cards revealed.",
      },
    ],
  },

  // ── Turn 5: Red (winning turn) ──────────────────────────────
  {
    team: "red",
    clue: { word: "OLYMPIC", count: 2 },
    hinterThought:
      "The Olympic TORCH and Olympic FIRE — that covers two. They might even spot CROWN as the last one!",
    reveals: [
      {
        cardIndex: 8, // TORCH
        voterIds: ["demo-red-seeker-2", "demo-red-seeker-1"],
        thought: {
          playerId: "demo-red-seeker-1",
          text: "The Olympic TORCH — the symbol of the games!",
        },
        annotation: "TORCH is Red! One more from the clue.",
      },
      {
        cardIndex: 3, // FIRE
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-2",
          text: "Olympic FIRE — the flame that never goes out!",
        },
        annotation:
          "FIRE is Red! That's both words from the clue, but Red still has a bonus guess...",
      },
      {
        cardIndex: 20, // CROWN
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-1",
          text: "CROWN must be the last Red card. We can win right now!",
        },
        annotation: "CROWN is Red — that's all 9! Red team wins the game!",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Assembled script
// ---------------------------------------------------------------------------

export const DEMO_SCRIPT: DemoScript = {
  board: DEMO_BOARD,
  players: DEMO_PLAYERS,
  startingTeam: "red",
  turns: DEMO_TURNS,
  introAnnotation:
    "Welcome to HintGrid! Two teams race to find their hidden words on the board. " +
    "Each team has a Hinter who sees all the colors and gives one-word clues, " +
    "and Seekers who guess which cards belong to their team.",
  outroAnnotation:
    "Red team found all 9 of their cards and wins! " +
    "Now it's your turn — create a room and play with friends!",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert DemoPlayer[] to Player[] (matching the shared type). */
export function demoPlayersToPlayers(demoPlayers: DemoPlayer[]): Player[] {
  return demoPlayers.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    team: p.team,
    role: p.role,
    connected: true,
    lastSeen: null,
  }));
}

/** Get the hinter for a given team from the demo players. */
export function getDemoHinter(
  players: DemoPlayer[],
  team: "red" | "blue"
): DemoPlayer {
  return players.find((p) => p.team === team && p.role === "clueGiver")!;
}

/** Get the first seeker for a given team (used as default perspective). */
export function getDemoSeeker(
  players: DemoPlayer[],
  team: "red" | "blue"
): DemoPlayer {
  return players.find((p) => p.team === team && p.role === "guesser")!;
}

/** Look up a DemoPlayer by id. */
export function getDemoPlayerById(
  players: DemoPlayer[],
  id: string
): DemoPlayer | undefined {
  return players.find((p) => p.id === id);
}
