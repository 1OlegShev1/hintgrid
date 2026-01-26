## Game State

Core state lives in `shared/types.ts` and is stored in Firestore.

### Firestore Data Model

```
rooms/{roomCode}
  ├── ownerId, currentTeam, startingTeam, currentClue, remainingGuesses
  ├── turnStartTime, turnDuration, gameStarted, gameOver, winner
  ├── paused, pauseReason, pausedForTeam
  ├── board[]   (25 cards: word, team, revealed, revealedBy, votes[])
  ├── createdAt, lastActivity
  │
  ├── players/{playerId}
  │     └── name, team, role, connected, lastSeen
  │
  └── messages/{messageId}
        └── playerId, playerName, message, timestamp, type
```

### Room Cleanup

**Automatic (best-effort)**:
- When a player explicitly leaves and is the last connected → room deleted
- Unreliable because most users close tabs instead of clicking "Leave"

**Manual cleanup**:
Run `npm run cleanup:rooms -- --hours 24` to delete rooms older than 24 hours.
Add `--dry-run` to preview. Default is 24 hours.
Requires Firebase Admin credentials (`gcloud auth application-default login`).

### Turn Flow

1. `startGame` generates board, sets starting team
2. Spymaster gives clue → `currentClue` and `remainingGuesses` set
3. Operatives vote and confirm reveals
4. Wrong guess or out of guesses → switch teams
5. Assassin → game over, other team wins
6. All team cards revealed → team wins

### Pause Mechanism

At turn transitions, if the incoming team lacks players:
- `paused: true`, `pauseReason` set, `turnStartTime: null`
- Owner calls `resumeGame` when conditions resolve

### Real-time Subscriptions

3 listeners per client: room document, players collection, messages collection.
