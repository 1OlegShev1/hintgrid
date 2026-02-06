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
  /** Seekers react to the clue before voting (shown after clue appears) */
  seekerReaction?: { playerId: string; text: string };
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
      "I can see the whole board... WHALE, REEF, and OCEAN are all Red and relate to the deep sea. I'll say DEEP 3!",
    seekerReaction: {
      playerId: "demo-red-seeker-1",
      text: "DEEP 3 — that's three words to find! I'm thinking water... WHALE, OCEAN, REEF all feel right. Let's start with the safest one.",
    },
    reveals: [
      {
        cardIndex: 0, // WHALE
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-2",
          text: "WHALE lives in the deep ocean — I agree with Bob, this is our best bet!",
        },
        annotation:
          "Both seekers vote on WHALE and it's revealed — correct! It's a Red card. Seekers must vote before a card is revealed.",
      },
      {
        cardIndex: 6, // REEF
        voterIds: ["demo-red-seeker-2", "demo-red-seeker-1"],
        thought: {
          playerId: "demo-red-seeker-1",
          text: "A REEF is found deep underwater. Two down, one to go!",
        },
        annotation: "REEF is Red! Another correct guess. Red is on a roll.",
      },
      {
        cardIndex: 23, // OCEAN
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-2",
          text: "OCEAN is the deepest of all — this has to be the third one. Let's go!",
        },
        annotation:
          "OCEAN is Red! Three for three — a perfect turn. The clue number (3) means up to 4 guesses, but Red plays it safe and ends their turn.",
      },
    ],
    turnEndAnnotation:
      "Great turn for Red! Seekers can always end their turn early to avoid risky guesses. Now it's Blue team's turn.",
  },

  // ── Turn 2: Blue ─────────────────────────────────────────────
  {
    team: "blue",
    clue: { word: "NIGHT", count: 2 },
    hinterThought:
      "STAR and MOON both shine at night — that's a solid connection. I just hope they don't go for SHADOW...",
    seekerReaction: {
      playerId: "demo-blue-seeker-1",
      text: "NIGHT 2... Stars come out at night, and the Moon shines at night. But SHADOW could also be a night thing — tricky!",
    },
    reveals: [
      {
        cardIndex: 4, // STAR
        voterIds: ["demo-blue-seeker-1", "demo-blue-seeker-2"],
        thought: {
          playerId: "demo-blue-seeker-2",
          text: "STAR is a classic night sky word — I'm confident on this one.",
        },
        annotation: "STAR is Blue — great start! Now for the second word...",
      },
      {
        cardIndex: 19, // BELL (neutral)
        voterIds: ["demo-blue-seeker-2"],
        thought: {
          playerId: "demo-blue-seeker-2",
          text: "Hmm, a midnight BELL ringing at night? It could work... I'll vote even though Max isn't sure.",
        },
        annotation:
          "BELL is Neutral! Only one seeker voted — with fewer votes, risky picks can slip through. The right answer was MOON.",
      },
    ],
    turnEndAnnotation:
      "Wrong guess ends the turn immediately! Hitting a neutral card isn't as bad as an opponent's card, but it still costs you the turn. Blue only found 1 of their 2 targets.",
  },

  // ── Turn 3: Red ──────────────────────────────────────────────
  {
    team: "red",
    clue: { word: "MEDIEVAL", count: 3 },
    hinterThought:
      "CASTLE, KNIGHT, and DRAGON are all medieval-themed and all Red. But SHADOW sits right next to DRAGON on the board — that's the Trap card. I hope they don't confuse them!",
    seekerReaction: {
      playerId: "demo-red-seeker-2",
      text: "MEDIEVAL 3 — a bold clue! CASTLE and KNIGHT are obvious. DRAGON feels medieval too... but what about SHADOW? Could be a dark medieval theme. We need to be careful.",
    },
    reveals: [
      {
        cardIndex: 14, // CASTLE
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-1",
          text: "A medieval CASTLE — can't get more medieval than that. Easy first pick!",
        },
        annotation: "CASTLE is Red! The safest pick pays off.",
      },
      {
        cardIndex: 18, // KNIGHT
        voterIds: ["demo-red-seeker-2", "demo-red-seeker-1"],
        thought: {
          playerId: "demo-red-seeker-2",
          text: "Medieval KNIGHT in shining armor — Bob and I are thinking the same thing.",
        },
        annotation: "KNIGHT is Red! Two for two. Now for the risky third guess...",
      },
      {
        cardIndex: 11, // DRAGON
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-1",
          text: "DRAGON or SHADOW? Dragons guard medieval castles... but SHADOW feels dark and dangerous. I'll go DRAGON — Clara agrees!",
        },
        annotation:
          "DRAGON is Red! Smart choice — SHADOW is actually the Trap card. Revealing the Trap means instant loss for your team!",
      },
    ],
    turnEndAnnotation:
      "Another perfect turn! Red wisely avoided the Trap card. The Trap is the most dangerous card on the board — a single wrong click and you lose the entire game.",
  },

  // ── Turn 4: Blue ─────────────────────────────────────────────
  {
    team: "blue",
    clue: { word: "FLIGHT", count: 3 },
    hinterThought:
      "Blue needs to catch up! ROCKET, PILOT, and MOON all connect to flight. Three correct guesses would even the score.",
    seekerReaction: {
      playerId: "demo-blue-seeker-1",
      text: "FLIGHT 3 — we need a big turn! ROCKET and PILOT are obvious flight words. MOON could work too — astronauts flew to the moon. Let's nail all three!",
    },
    reveals: [
      {
        cardIndex: 1, // ROCKET
        voterIds: ["demo-blue-seeker-1", "demo-blue-seeker-2"],
        thought: {
          playerId: "demo-blue-seeker-2",
          text: "A ROCKET takes flight — this is our safest pick. Let's build momentum!",
        },
        annotation: "ROCKET is Blue! Blue team starts their comeback.",
      },
      {
        cardIndex: 13, // PILOT
        voterIds: ["demo-blue-seeker-2", "demo-blue-seeker-1"],
        thought: {
          playerId: "demo-blue-seeker-1",
          text: "A PILOT flies planes — perfect match. We're in sync on this one!",
        },
        annotation: "PILOT is Blue! Two in a row — the comeback is real.",
      },
      {
        cardIndex: 9, // MOON
        voterIds: ["demo-blue-seeker-1", "demo-blue-seeker-2"],
        thought: {
          playerId: "demo-blue-seeker-2",
          text: "Astronauts flew to the MOON — the most famous flight in history! This has to be it.",
        },
        annotation:
          "MOON is Blue! A perfect turn — Blue now has 4 cards revealed.",
      },
    ],
    turnEndAnnotation:
      "Blue fights back with a perfect turn! Score check: Red has 6 cards found (3 left), Blue has 4 (4 left). It's anyone's game — but Red goes next.",
  },

  // ── Turn 5: Red (winning turn) ──────────────────────────────
  {
    team: "red",
    clue: { word: "OLYMPIC", count: 2 },
    hinterThought:
      "We only need 3 more cards. The Olympic TORCH and Olympic FIRE cover two. If they use the bonus guess on CROWN, we win!",
    seekerReaction: {
      playerId: "demo-red-seeker-2",
      text: "OLYMPIC 2 — the Olympic torch and the Olympic fire? That gives us two plus a bonus guess. If we get them right, we might be able to find the last card and win!",
    },
    reveals: [
      {
        cardIndex: 8, // TORCH
        voterIds: ["demo-red-seeker-2", "demo-red-seeker-1"],
        thought: {
          playerId: "demo-red-seeker-1",
          text: "The Olympic TORCH — the symbol of the games! This is definitely one of Ada's words.",
        },
        annotation: "TORCH is Red! One more from the clue.",
      },
      {
        cardIndex: 3, // FIRE
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-2",
          text: "The Olympic FIRE — the eternal flame! That's both clue words. Now we have a bonus guess...",
        },
        annotation:
          "FIRE is Red! That's both words from the clue. But with 'count + 1' guessing, Red has one bonus guess left...",
      },
      {
        cardIndex: 20, // CROWN
        voterIds: ["demo-red-seeker-1", "demo-red-seeker-2"],
        thought: {
          playerId: "demo-red-seeker-1",
          text: "CROWN is the only Red card left on the board — this is our chance to win it all! Let's go!",
        },
        annotation: "CROWN is Red — that's all 9 cards! Red team wins the game!",
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
