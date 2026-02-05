## Game State

Core state lives in `shared/types.ts` and is stored in Firebase Realtime Database.

**Type Structure:**
- Client types: `Card`, `Player`, `GameState`, `ChatMessage` — Used in React components
- Firebase types: `FirebaseBoardCard`, `FirebasePlayerData`, `FirebaseRoomData` — Match RTDB schema exactly
- Transform functions in `hooks/room/types.ts` convert between Firebase and client types

### Realtime Database Data Model

```json
{
  "publicRooms": {
    "{roomCode}": {
      "roomName": "Friday Game",
      "ownerName": "Alex",
      "playerCount": 7,
      "status": "lobby|playing|paused",
      "timerPreset": "fast|normal|relaxed",
      "createdAt": 1234567890
    }
  },
  "rooms": {
    "{roomCode}": {
      "ownerId": "...",
      "currentTeam": "red|blue",
      "startingTeam": "red|blue",
      "wordPack": ["classic", "geography", "space"],
      "currentClue": { "word": "...", "count": 3 },
      "remainingGuesses": 3,
      "turnStartTime": 1234567890,
      "timerPreset": "fast|normal|relaxed",
      "redHasGivenClue": false,
      "blueHasGivenClue": false,
      "gameStarted": false,
      "gameOver": false,
      "winner": null,
      "paused": false,
      "pauseReason": null,
      "pausedForTeam": null,
      "locked": false,
      "visibility": "public|private",
      "roomName": "Friday Game",
      "maxPlayers": 300,
      "bannedPlayers": { "{playerId}": 1234567890 },
      "createdAt": 1234567890,
      "board": [
        { "word": "...", "team": "red", "revealed": false, "revealedBy": null, "votes": {} }
      ],
      "players": {
        "{playerId}": {
          "name": "...",
          "avatar": "🐱",
          "team": "red|blue|null",
          "role": "clueGiver|guesser|null",
          "connected": true,
          "lastSeen": 1234567890
        }
      },
      "messages": {
        "{messageId}": {
          "playerId": "...",
          "playerName": "...",
          "message": "...",
          "timestamp": 1234567890,
          "type": "clue|chat|system|reveal|game-system",
          "reactions": {
            "👍": { "{playerId}": true },
            "❤️": { "{playerId}": true }
          }
        }
      }
    }
  }
}
```

### Room Cleanup

**Automatic via onDisconnect**:
- When a player joins, `onDisconnect()` is set to mark them as disconnected
- Firebase server detects connection loss (tab close, network drop, etc.)
- Only the room owner sets up room-level `onDisconnect` (for room deletion when they're the last player)
- Non-owners only set up player-level disconnect handlers (permission requirement)
- When last player leaves/disconnects, room is deleted

This is **reliable** because it's server-side — no client cooperation needed.

**Stale player cleanup** (owner-only):
- Owner's client runs periodic cleanup every 30 seconds
- Players disconnected for 2+ minutes are demoted to spectators (team/role cleared)
- Their votes are also removed from the board
- A system message notifies the room: "PlayerName moved to spectators (disconnected)"
- This keeps role slots available and prevents ghost players from blocking the game

**Owner transfer**:
- If the room owner disconnects for 30+ seconds, ownership transfers to another connected player
- If the owner explicitly leaves, ownership transfers immediately

**Explicit leave** (via Leave button):
- Player's `connected` is set to `false`, `lastSeen` updated
- Player's votes are cleared from all cards (each vote removed individually for permission)
- If player was owner, ownership transfers immediately
- `goOffline()` triggers immediate Firebase disconnect (clean disconnect)

**Idle timeout** (lobby only):
- After 1 hour of no activity in lobby, "Are you still there?" modal appears
- User has 60 seconds to respond before being auto-redirected to home
- Disabled during active games (only triggers in lobby or game-over state)
- Helps clean up abandoned rooms from users who leave tabs open

**Backup manual cleanup**:
Run `npm run cleanup:rooms -- --hours 24` to delete rooms older than 24 hours.
Requires Firebase Admin credentials (`gcloud auth application-default login`).
This also cleans up corresponding `publicRooms` entries.

**Orphaned public index cleanup**:
- The `onDisconnect` handler removes both `/rooms/{roomCode}` and `/publicRooms/{roomCode}` atomically
- The cleanup script also removes both collections
- If orphaned entries accumulate, run: `npm run cleanup:orphaned-public-rooms`
- The home page (`subscribeToPublicRooms` and `getPublicRooms`) also detects and cleans orphans as a fallback:
  - Checks up to 50 public room entries to verify each room actually exists
  - Orphaned entries are deleted in the background (any authenticated user can delete)
  - Security rule: anyone can delete `/publicRooms/{roomCode}` if `/rooms/{roomCode}` doesn't exist
  - This provides automatic cleanup when users visit the home page

### Public Rooms

Rooms can be public or private, controlled by the `visibility` field (default: `"public"`).

**Public room discovery**:
- Public rooms are indexed at `/publicRooms/{roomCode}` for efficient home page queries
- Home page subscribes to `/publicRooms` in real-time for instant updates
- Shows top 6 public rooms with 4+ players, sorted by player count
- Locked rooms are removed from the public index
- Index is updated client-side by the room owner on state changes

**Public room data** (stored in `/publicRooms/{roomCode}`):
| Field | Description |
|-------|-------------|
| `roomName` | Display name (auto-generated as "{OwnerName}'s Room" if not set) |
| `ownerName` | Name of the room owner |
| `playerCount` | Number of connected players |
| `status` | Current state: `lobby`, `playing`, or `paused` |
| `timerPreset` | Timer setting for the room |
| `createdAt` | Room creation timestamp |

**Player limits**:
- `maxPlayers` field limits total players (default: 300)
- New players are rejected with "Room is full" if at capacity
- Existing players can always rejoin

**Kick and ban**:
- Room owner can kick players, removing them entirely from the room
- Kicked players are added to `bannedPlayers` with a 2-minute expiry timestamp
- Banned players cannot rejoin until the ban expires
- Ban is checked on join: `bannedPlayers[uid] > Date.now()` = blocked

### Turn Flow

1. `startGame` generates board, sets starting team
2. Hinter gives clue → `currentClue` and `remainingGuesses` set
3. Seekers vote and confirm reveals
4. Wrong guess or out of guesses → switch teams
5. Trap → game over, other team wins
6. All team cards revealed → team wins

### Pause Mechanism

The game can be paused manually or automatically:
- Room owner clicks Pause button → `pauseReason: "ownerPaused"`
- No connected players at all → `pauseReason: "teamDisconnected"`
- No connected hinter (before clue given) → `pauseReason: "clueGiverDisconnected"`
- No connected seekers (after clue given) → `pauseReason: "noGuessers"`

When paused:
- `paused: true`, `pauseReason` set, `turnStartTime: null`
- Owner can reassign roles from connected players or spectators
- Owner can remove any player from their team/role
- Owner calls `resumeGame` when team has connected hinter + seeker

### Game States

The room can be in one of four states, determined by the `gameStarted`, `paused`, and `gameOver` flags:

| State | Flags | Description |
|-------|-------|-------------|
| **Lobby** | `gameStarted: false` | Pre-game, players joining and selecting teams |
| **Active Game** | `gameStarted: true`, `paused: false`, `gameOver: false` | Game in progress |
| **Paused** | `gameStarted: true`, `paused: true`, `gameOver: false` | Game paused due to disconnections |
| **Game Over** | `gameOver: true` | Game finished, preparing for rematch |

### Team Management Modes

Team management permissions depend on game state:

**Open Mode** (Lobby, Paused, Game Over):
```typescript
const isActiveGame = gameStarted && !paused && !gameOver;
const isTeamManagementAllowed = !isActiveGame;
```

- Players can join/leave teams freely
- Owner can remove any other player from their team (they become spectators)

**Restricted Mode** (Active Game):
- Players cannot change their own team/role
- Only owner can add spectators as seekers (not hinter)
- Owner cannot remove players during active gameplay

**Player Removal:**
- Removing a player clears their team/role, making them a spectator
- Spectators can rejoin a team or leave the room
- Kicking a player is separate: it removes them from the room entirely and applies a temporary ban

### Real-time Subscriptions

3 listeners per client: room document, players collection, messages collection.

### Message Management

**Message Types:**
- `clue` — Clue given by hinter (shown in Game Log)
- `reveal` — Card reveal (shown in Game Log)
- `game-system` — Game paused/resumed/ended (shown in Game Log)
- `chat` — User chat messages (shown in Chat)
- `system` — User-related system messages like player joined, owner changed (shown in Chat)

**Clearing Behavior:**
- **New game (lobby→start, rematch):** Clears game messages (`clue`, `reveal`, `game-system`), keeps chat messages
- **Pause/resume:** No clearing (timer stops, messages preserved)
- **End game:** No clearing (adds system message)

**Message Limits:**
- Query limit: 300 messages (enough for spectator-heavy rooms)
- Auto-prune threshold: 400 messages (deletes oldest, keeps 300)
- Pruning happens in background on ~10% of chat sends to avoid unbounded growth

## Client-Side State

Some state is stored locally on the client (not synced to Firebase).

### Player Identity

Player identity uses **Firebase Anonymous Authentication**. Each browser session gets a unique `uid` from Firebase Auth, which serves as the player ID. This is more reliable than localStorage-based IDs because Firebase handles session persistence automatically.

### localStorage Keys

| Key | Description | Default |
|-----|-------------|---------|
| `hintgrid_avatar` | Player's selected emoji avatar | Random from preset list |
| `hintgrid_sound_volume` | Master volume (0-1) | `0.5` |
| `hintgrid_sound_muted` | Whether sounds are muted | `false` |
| `hintgrid_music_enabled` | Whether music is enabled | `false` |
| `hintgrid-theme` | Theme mode (light/dark/system) | `system` |
| `hintgrid-style` | Theme style (classic/synthwave) | `synthwave` |

**Note:** Keys are defined in `shared/constants.ts` (except theme keys which are in `ThemeProvider.tsx`). Music volume is derived from master volume (30%).

### sessionStorage Keys

| Key | Description |
|-----|-------------|
| `hintgrid_audio_unlocked` | Tracks if user has interacted with the page (for browser autoplay policy). Persists across page reloads within same tab session. |

**Note:** Key is defined in `SoundContext.tsx`. This flag indicates user intent (music should auto-play), but **a user gesture is still required on each page load** to unlock the browser's audio context. The code always sets up event listeners for user interaction; sessionStorage just remembers that music should start playing once audio is unlocked.

**Audio Context Handling:**
- On each page load, the code attempts to resume the audio context immediately (may succeed if user recently interacted)
- Event listeners are always set up for click/touchstart/keydown to unlock audio on first interaction
- When `setMusicTrack()` is called but audio isn't ready, the track is stored as pending
- An `audioUnlockTrigger` state forces the music effect to re-run once audio becomes available
- The Howl instance uses `onplayerror` callback to retry playback on the "unlock" event

### Game Configuration Constants

Defined in `shared/constants.ts`:

| Constant | Value | Description |
|----------|-------|-------------|
| `TIMER_PRESETS` | See below | Timer presets with clue/guess/bonus durations |
| `DEFAULT_TIMER_PRESET` | `"normal"` | Default timer preset |
| `WORD_PACKS` | `["classic", "kahoot", "geography", "popculture", "science", "space", "nature"]` | Available word packs |
| `DEFAULT_WORD_PACK` | `["classic"]` | Default word pack selection (array) |
| `MAX_PLAYER_NAME_LENGTH` | `20` | Maximum player name length |
| `MAX_CLUE_LENGTH` | `30` | Maximum clue word length |
| `MAX_CHAT_MESSAGE_LENGTH` | `200` | Maximum chat message length |
| `MAX_ROOM_NAME_LENGTH` | `40` | Maximum room name length |
| `MIN_PLAYERS_TO_START` | `4` | Minimum players to start game |
| `STALE_PLAYER_GRACE_MS` | `120000` (2 min) | Time before disconnected player is demoted to spectator |
| `STALE_PLAYER_CHECK_INTERVAL_MS` | `30000` (30s) | How often to check for stale players |
| `REACTION_EMOJIS` | `[20 emojis]` | Curated set of reaction emojis for chat messages |
| `DEFAULT_VISIBILITY` | `"public"` | Default room visibility |
| `MAX_PLAYERS_DEFAULT` | `300` | Default max players per room |
| `MIN_PLAYERS_FOR_PUBLIC_LIST` | `4` | Minimum players for a room to appear in public list |
| `PUBLIC_ROOMS_DISPLAY_LIMIT` | `6` | Number of public rooms to show on home page |
| `BAN_DURATION_MS` | `120000` (2 min) | Duration of temporary ban after being kicked |

**Timer Presets:**

| Preset | Clue Duration | Guess Duration | First Clue Bonus |
|--------|---------------|----------------|------------------|
| `fast` | 60s | 45s | +30s |
| `normal` | 90s | 60s | +45s |
| `relaxed` | 120s | 90s | +60s |

- **Clue Duration**: Time for hinter to give their clue
- **Guess Duration**: Time for seekers to guess after clue is given
- **First Clue Bonus**: Extra time added to each team's first clue (cold start is hardest)

### Input Validation

Input validation utilities in `shared/validation.ts`:

| Function | Description |
|----------|-------------|
| `sanitizePlayerName(name)` | Trim and truncate player name |
| `sanitizeClue(clue)` | Trim and truncate clue word |
| `sanitizeChatMessage(msg)` | Trim and truncate chat message |
| `sanitizeChatMessageWithCensor(msg)` | Trim, truncate, and censor profanity in chat message |
| `isValidPlayerName(name)` | Check if name is non-empty and within limit |
| `isValidClueFormat(clue)` | Check if clue is single word within limit |
| `isValidChatMessage(msg)` | Check if message is non-empty and within limit |
| `validatePlayerName(name)` | Validate name with detailed errors (checks length, profanity) |
| `validateClueWord(clue)` | Validate clue with detailed errors (checks format, length, profanity) |

**Profanity Filtering** (`shared/profanity.ts`):
- Uses `bad-words-next` library with English dictionary
- **Blocking mode** (`containsProfanity()`): Used for player names and clues — blocks input entirely if profanity detected
- **Censoring mode** (`censorProfanity()`): Used for chat messages — replaces profane words with `***` but allows the message
- Case-insensitive detection
- Player names and clues are rejected with error message "Please choose a different name/clue"
- Chat messages are automatically censored before being sent

### Sound System

All sounds use audio files via `use-sound`/Howler.js for realistic, high-quality playback.

**Sound Effects** (`/public/sounds/`):
- `game-start.mp3` — Fantasy success notification when game begins
- `turn-change.mp3` — Quick software tone when turn switches teams
- `game-over.mp3` — Crowd applause celebration when a team wins (played for winning team)
- `game-lose.mp3` — Crowd disappointed "ooh" (played for losing team)
- `trap-snap.mp3` — Metal clang/snap (played for team that hit the trap)
- `tick.mp3` — Soft click sound every 2s in the last 30 seconds
- `tick-urgent.mp3` — Fast mechanical alarm clock tic-tac every 0.5s in the last 10 seconds
- `card-reveal.mp3` — Subtle page turn/flick when a card is revealed
- `clue-submit.mp3` — Soft interface start sound when clue giver submits a clue

**Background Music** (`/public/sounds/music/`):
- `lobby.mp3` — Chill lo-fi for lobby waiting
- `game-30s.mp3` — Upbeat lo-fi for 30s turn games
- `game-60s.mp3` — Balanced lo-fi for 60s turn games
- `game-90s.mp3` — Relaxed lo-fi for 90s turn games
- `victory.mp3` — Happy lo-fi for game end screen

Music auto-switches based on game state (lobby → game → victory).

**Sound Sources:**
- Sound effects: [Mixkit](https://mixkit.co/free-sound-effects/) and [BigSoundBank](https://bigsoundbank.com)
- Background music: [OpenGameArt.org](https://opengameart.org) (CC0)

**Accessibility:**
- Respects `prefers-reduced-motion` OS setting (disables all sounds and music when set)
- Volume and mute settings persist across sessions via localStorage
- Separate controls for sound effects and background music

**Sound Architecture:**
- `SoundContext` (`contexts/SoundContext.tsx`) — Global provider for sound/music state and playback
- `useTimerSound` hook — Handles timer tick logic based on time remaining
- `usePrefersReducedMotion` hook — Detects OS accessibility preference
- `use-sound` package — Wrapper around Howler.js for sound effect playback
- `howler` package — Direct use for looping background music

## Application Architecture

### Context Providers (in `app/layout.tsx` order)

| Provider | Location | Purpose |
|----------|----------|---------|
| `ThemeProvider` | `components/ThemeProvider.tsx` | Theme mode (light/dark/system) and style (classic/synthwave) |
| `ThemeBackground` | `components/ThemeBackground.tsx` | Theme-specific background effects (synthwave sun/grid) |
| `AuthProvider` | `contexts/AuthContext.tsx` | Firebase Anonymous Auth, provides `uid` |
| `ErrorProvider` | `contexts/ErrorContext.tsx` | Global error toast notifications |
| `SoundProvider` | `contexts/SoundContext.tsx` | Sound effects and volume control |
| `GameProvider` | `components/GameContext.tsx` | Room-level state flags for Navbar warnings |

### Custom Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useRtdbRoom` | `hooks/useRtdbRoom.ts` | Main room hook, composes connection + actions |
| `useRoomConnection` | `hooks/room/useRoomConnection.ts` | Firebase listeners, presence, player state |
| `useGameActions` | `hooks/room/useGameActions.ts` | Game action handlers (vote, reveal, clue) |
| `useChatActions` | `hooks/room/useChatActions.ts` | Chat messages, emoji picker, and reactions |
| `useRoomDerivedState` | `hooks/useRoomDerivedState.ts` | Computed state (isMyTurn, canVote, etc.) |
| `useGameTimer` | `hooks/useGameTimer.ts` | Turn countdown timer; only owner (or fallback) triggers timeout |
| `useTransitionOverlays` | `hooks/useTransitionOverlays.ts` | Game start/turn change/game over animations |
| `useTimerSound` | `hooks/useTimerSound.ts` | Timer tick sounds based on time remaining |
| `usePrefersReducedMotion` | `hooks/usePrefersReducedMotion.ts` | Detects OS reduced motion preference |

### Components

**UI Primitives** (`components/ui/`):
Design system components for consistent styling and theming support:

| Component | Purpose |
|-----------|---------|
| `Button` | Primary, secondary, danger, success, warning, ghost variants with sizes |
| `Card` | Content containers with variants (default, elevated, ghost, team colors) |
| `Modal` / `ConfirmModal` | Dialog overlays with icon support and actions |
| `Input` / `Textarea` | Form inputs with labels, errors, and helper text |
| `Badge` | Status indicators and labels (status, team colors) |
| `TeamIndicator` | Consistent team-colored elements (text, card, border, glow, banner) |

Helper utilities in `lib/utils.ts`:
- `cn()` — Combines `clsx` and `tailwind-merge` for conditional class merging

Team color helpers in `TeamIndicator`:
- `getTeamClasses()` — Get team-specific classes for a variant
- `getTeamTextClass()`, `getTeamBgClass()`, `getTeamBorderClass()` — Individual utilities

**Error Handling:**
- `ErrorBoundary` (`components/ErrorBoundary.tsx`) — Catches React errors, prevents full app crash

**Room Views:**
- `GameView` (`components/room/GameView.tsx`) — Active game UI (board, chat, status)
- `LobbyView` (`components/room/LobbyView.tsx`) — Pre-game lobby UI (team selection)

**GameView Layout:**
- Desktop: Sidebar (Game Log + Chat) height syncs to game board via ResizeObserver
- Mobile: Fixed 600px sidebar height (single column layout)
- Each sidebar section takes 50% of available height with internal scrolling

**Chat Components:**
- `EmojiPickerButton` (`components/room/EmojiPickerButton.tsx`) — Full emoji picker dropdown for chat input (uses `emoji-picker-react`)
- `MessageReactions` (`components/room/MessageReactions.tsx`) — Reaction display and picker for chat messages
- `ChatLog` (`components/ChatLog.tsx`) — IRC-style chat log with reaction support and auto-scroll toggle

**Chat Auto-Scroll:**
- Toggle button in chat header ("⬇ Auto" / "⬇ Manual")
- When enabled (default), chat scrolls to bottom on new messages
- When disabled, stays at current scroll position (for reading history)

### Key Files

| File | Purpose |
|------|---------|
| `lib/firebase.ts` | Firebase app/auth/database initialization |
| `lib/firebase-auth.ts` | Anonymous sign-in helper |
| `lib/rtdb-actions.ts` | All Firebase Realtime Database operations + stale player cleanup + public rooms subscription |
| `lib/retry.ts` | Retry utility with exponential backoff for network operations |
| `lib/utils.ts` | `cn()` utility for merging Tailwind classes |
| `shared/types.ts` | TypeScript types for game state and Firebase data structures |
| `shared/game-utils.ts` | Pure game logic (vote threshold, clue validation) |
| `shared/validation.ts` | Input sanitization and validation utilities |
| `shared/words.ts` | Word lists and board generation |
| `shared/constants.ts` | Game config, localStorage keys, avatars, presence cleanup timing |
| `database.rules.json` | Firebase security rules (with server-side validation) |

### Utilities

**Retry Logic** (`lib/retry.ts`):
- `withRetry(fn, options)` — Wraps async functions with exponential backoff retry
- `isRetryableError(error)` — Distinguishes network errors (retry) from validation errors (don't retry)
- Applied to critical operations: chat messages, game actions

**Connection Indicator** (`components/ConnectionIndicator.tsx`):
- Shows "Offline" badge in Navbar when Firebase connection is lost
- Uses Firebase `.info/connected` for real-time status monitoring

## Security

### Firebase Security Rules

The `database.rules.json` file enforces server-side validation:

**Write Permissions:**
- Room creation: Any authenticated user
- Room deletion: Owner only
- Owner reassignment: Current owner, or any player if owner is disconnected
- Game state (`gameStarted`): Owner only
- Turn state (`currentTeam`, `gameOver`, `winner`, etc.): Owner or seekers
- Board modifications: Owner, hinter, or seeker
- Vote modifications: Only the voting player can modify their own vote
- Player data: Self or owner
- Messages: Any authenticated player can send; owner can delete all
- Reactions: Only the reacting player can add/remove their own reactions

**Validation Rules:**
- Turn duration: Must be 30, 60, or 90 seconds; only settable before game starts
- Word pack: Must be valid pack names; only settable before game starts; supports multi-select
- Clue format: Word 1-30 chars, count >= 0
- Player name: 1-20 characters
- Chat message: 1-200 characters

**Limitations** (validated client-side only):
- Clue word not matching board words
- Duplicate hinter prevention
- Vote threshold logic
- Teams ready validation
- Profanity filtering (player names, clues blocked; chat messages censored)

## Testing

### Testing Philosophy

**Test business logic, not Firebase.** We don't test that Firebase stores and retrieves data correctly — that's Firebase's job. We test that our code makes the right decisions and coordinates state correctly.

| Test Type | What to Test | What NOT to Test |
|-----------|--------------|------------------|
| Unit | Pure functions, validation, game rules | React components, Firebase calls |
| Integration | State transitions, coordinated updates, permissions | Thin CRUD wrappers, subscriptions |
| E2E | User flows, multi-player interactions | Every edge case (use integration for that) |

### Test Layers

```
┌─────────────────────────────────────────────────────────────┐
│  E2E (Playwright)                                          │
│  - Full user flows: create room → play game → win          │
│  - Multi-player with separate browser contexts             │
│  - Run: npm run test:e2e                                   │
├─────────────────────────────────────────────────────────────┤
│  Integration (Vitest + Firebase Emulator)                  │
│  - rtdb-actions.ts: game flow, kick/ban, pause, etc.       │
│  - Requires: npm run firebase:emulators (separate terminal)│
│  - Run: npm run test:integration                           │
├─────────────────────────────────────────────────────────────┤
│  Unit (Vitest)                                             │
│  - shared/*: validation, game-utils, words, constants      │
│  - lib/retry.ts, lib/utils.ts                              │
│  - Run: npm test                                           │
└─────────────────────────────────────────────────────────────┘
```

### What's Worth Integration Testing

**DO test** (complex logic, state transitions):
- Game lifecycle: `startGame`, `endGame`, `rematch`
- Turn mechanics: `giveClue`, `voteCard`, `confirmReveal`, `endTurn`
- Pause/resume logic and auto-pause conditions
- Kick/ban with vote clearing
- Owner transfer with grace period
- Team randomization

**DON'T test** (thin wrappers, low risk):
- `sendMessage`, `addReaction`, `removeReaction` — just Firebase push/set/remove
- `subscribeToPublicRooms` — testing Firebase's subscription system
- Simple setters: `setWordPack`, `setCustomWords`, `setRoomLocked`

### Coverage Expectations

| Layer | Target | Notes |
|-------|--------|-------|
| `shared/*` | ~100% | Pure functions, easy to test exhaustively |
| `lib/rtdb-actions.ts` | ~70% | Core game logic covered; chat/subscriptions skipped |
| `lib/retry.ts` | ~95% | Utility with clear behavior |

Run coverage: `npm test -- --coverage` or `npm run test:integration -- --coverage`

### E2E Testing with Playwright

E2E tests live in `tests/` and use Playwright. Run with:
- `npm run test:e2e` — Run against local dev server
- `npm run test:e2e:deployed` — Run against production (https://hintgrid.com)

**Multi-player test setup:**

Each simulated player needs a **separate browser context** to get a unique Firebase Auth session:

```typescript
// CORRECT: Separate contexts = separate Firebase Auth sessions
const contexts = await Promise.all([
  browser.newContext(),
  browser.newContext(),
]);
const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

// WRONG: Same context = same Firebase uid for all pages
const pages = [await context.newPage(), await context.newPage()];
```

This is because Firebase Auth stores credentials in IndexedDB, which is shared across pages in the same browser context. Without separate contexts, all "players" would have the same `uid` and appear as the same player.

### Test ID Conventions

**All interactive elements should have `data-testid` attributes for Playwright selectors.**

Use these prefixes by component area:

| Prefix | Area | Examples |
|--------|------|----------|
| `home-` | Home page | `home-name-input`, `home-create-btn`, `home-join-btn` |
| `lobby-` | Lobby/team selection | `lobby-start-btn`, `lobby-randomize-btn`, `lobby-join-red-clueGiver` |
| `game-` | Active game UI | `game-clue-input`, `game-clue-btn`, `game-end-turn-btn` |
| `board-` | Game board | `board-card-0`, `board-reveal-12` |

**Naming pattern:** `{area}-{element}-{identifier?}`

Examples:
```tsx
// Button
data-testid="lobby-start-btn"

// Input
data-testid="game-clue-input"

// Dynamic element (with index or ID)
data-testid={`board-card-${index}`}
data-testid={`lobby-join-${team}-${role}`}
```

**Board card attributes (testing):**
- `data-card-team` is set to `red|blue|neutral|trap` for clue givers and for revealed cards.
- Use this attribute in tests when you need stable team ownership checks.

**When to add test IDs:**
- All buttons that trigger actions
- All form inputs
- Key status displays (game over panel, winner text)
- Dynamic elements that tests need to interact with

**Do NOT use:**
- Loose text selectors like `getByText('Player2')` — use exact match or test IDs
- CSS class selectors — they change with styling
