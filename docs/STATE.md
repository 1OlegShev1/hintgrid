## Game State

Core state lives in `shared/types.ts` and is stored in Firestore.

### Core Fields

- `roomCode`: identifier for the room.
- `players`: list of players with `team`/`role` assigned in lobby before start.
- `board`: 25 cards with `word`, `team`, and `revealed`.
- `ownerId`: room creator who can change settings before start.
- `cardVotes`: map of card index to playerId list for votes.
- `currentTeam`: team whose turn it is.
- `startingTeam`: team that starts (has 9 cards).
- `currentClue`: the active clue for the turn.
- `remainingGuesses`: guesses left this turn (`count + 1`).
- `turnStartTime` and `turnDuration`: used to compute timer.
- `gameStarted`, `gameOver`, `winner`: game lifecycle flags.

### Firestore Data Model

```
rooms/{roomCode}
  ├── (room document fields: ownerId, currentTeam, gameStarted, etc.)
  ├── players/{playerId}
  │     ├── name, team, role, connected, lastSeen
  ├── board/{cardIndex}
  │     ├── word, team, revealed, revealedBy, votes
  └── messages/{messageId}
        ├── playerId, playerName, message, timestamp, type
```

## Turn Flow

1. `startGame` assigns teams/roles, sets `startingTeam` and `currentTeam`.
2. Spymaster gives a clue (`giveClue`), setting `currentClue` and `remainingGuesses`.
3. Operatives vote on cards (`voteCard`), then confirm reveal (`confirmReveal`) when threshold met.
4. Wrong reveal switches `currentTeam` immediately.
5. When guesses run out or `endTurn` is called, the turn passes and clue resets.
6. Assassin ends the game; all cards of a team revealed wins.
7. `rematch` resets board and reassigns teams while keeping players.

## Lifecycle

- Rooms are created on first join with a room code.
- Game starts when owner calls `startGame` with 4+ players.
- After game ends, owner can call `rematch` to start a new game.
- Owner can call `endGame` to cancel an active game and return to lobby.
- Player reconnection is supported via `playerId` stored in sessionStorage.
