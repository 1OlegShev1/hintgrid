## Game State

Core state lives in `shared/types.ts` and is stored in Firebase Realtime Database.

### Realtime Database Data Model

```json
{
  "rooms": {
    "{roomCode}": {
      "ownerId": "...",
      "currentTeam": "red|blue",
      "startingTeam": "red|blue",
      "currentClue": { "word": "...", "count": 3 },
      "remainingGuesses": 3,
      "turnStartTime": 1234567890,
      "turnDuration": 60,
      "gameStarted": false,
      "gameOver": false,
      "winner": null,
      "paused": false,
      "pauseReason": null,
      "pausedForTeam": null,
      "createdAt": 1234567890,
      "board": [
        { "word": "...", "team": "red", "revealed": false, "votes": {} }
      ],
      "players": {
        "{playerId}": {
          "name": "...",
          "team": "red|blue",
          "role": "clueGiver|guesser",
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
          "type": "clue|chat|system"
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
- When last player leaves/disconnects, room is deleted

This is **reliable** because it's server-side — no client cooperation needed.

**Backup manual cleanup**:
Run `npm run cleanup:rooms -- --hours 24` to delete rooms older than 24 hours.
Requires Firebase Admin credentials (`gcloud auth application-default login`).

### Turn Flow

1. `startGame` generates board, sets starting team
2. Clue giver gives clue → `currentClue` and `remainingGuesses` set
3. Guessers vote and confirm reveals
4. Wrong guess or out of guesses → switch teams
5. Trap → game over, other team wins
6. All team cards revealed → team wins

### Pause Mechanism

At turn transitions, if the incoming team lacks players:
- `paused: true`, `pauseReason` set, `turnStartTime: null`
- Owner calls `resumeGame` when conditions resolve

### Real-time Subscriptions

3 listeners per client: room document, players collection, messages collection.

## Client-Side State

Some state is stored locally on the client (not synced to Firebase).

### localStorage Keys

| Key | Description | Default |
|-----|-------------|---------|
| `cluecards_player_id` | Unique player identifier | Auto-generated UUID |
| `cluecards_avatar` | Player's selected emoji avatar | Random from preset list |
| `cluecards_sound_volume` | Sound effects volume (0-1) | `0.5` |
| `cluecards_sound_muted` | Whether sounds are muted | `false` |

### Sound System

Hybrid approach: audio files for game events (via `use-sound`/Howler.js), Web Audio API for timer ticks.

**Audio Files** (`/public/sounds/`):
- `game-start.mp3` — Fantasy success notification when game begins
- `turn-change.mp3` — Quick software tone when turn switches teams
- `game-over.mp3` — Celebration sound when a team wins

**Synthesized Sounds** (Web Audio API):
- `tick` — Soft 800Hz sine tone every 2s in the last 30 seconds
- `tickUrgent` — Sharper 1200Hz+1500Hz dual tone every 0.5s in the last 10 seconds

**Sound Sources:**
Audio files sourced from [Mixkit](https://mixkit.co/free-sound-effects/) under the Mixkit License (free for commercial use).

**Accessibility:**
- Respects `prefers-reduced-motion` OS setting (disables all sounds when set)
- Volume and mute settings persist across sessions via localStorage

**Architecture:**
- `SoundContext` (`contexts/SoundContext.tsx`) — Global provider for sound state and playback
- `useTimerSound` hook — Handles timer tick logic based on time remaining
- `usePrefersReducedMotion` hook — Detects OS accessibility preference
- `use-sound` package — Wrapper around Howler.js for audio file playback
