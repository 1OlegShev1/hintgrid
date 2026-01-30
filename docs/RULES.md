## Game Rules Summary

- Two teams (red and blue) with a hinter and seekers.
- 25 words in a 5x5 grid; one trap, 7 neutral, 8 for one team, 9 for the starting team.
- Hinter gives a one-word clue plus a number.
- Clues cannot be any of the words currently on the board.
- Seekers guess up to the clue number plus one extra guess.
- Turn ends immediately on guessing the opposing team or a neutral card.
- Guessing the trap ends the game immediately (instant loss).
- A team wins by revealing all of its cards.

## Implementation Notes

This project follows standard word-guessing game rules, with the following clarifications:

- A clue is required before seekers can guess.
- Remaining guesses are tracked as `count + 1`.
- Timer presets control turn durations:
  - **Fast**: 60s clue / 45s guess
  - **Normal**: 90s clue / 60s guess  
  - **Relaxed**: 120s clue / 90s guess
  - Each team's first clue gets +50% bonus time (cold start is harder)
- Word packs available: "Classic" (~270 words), "Kahoot" (70 words), "Geography" (200 words), "Pop Culture" (180 words), "Science" (200 words), "Space" (180 words), "Nature" (250 words). Owner selects before game start.
- Clue validation blocks:
  - Exact matches with board words (case-insensitive)
  - Prefix/suffix relationships (e.g., "farm" blocked if "farmer" on board, but "war" allowed even if "dwarf" on board)
  - Simple plural variants (adding/removing S/ES)
- Seekers vote on a card first; a teammate must confirm once votes meet a threshold.
  - Vote threshold: 1 vote for 1-3 seekers, 2 votes for 4+ seekers.
  - Threshold is based on total seekers assigned to the team (not affected by temporary disconnections).
- Room owner can start rematch after game ends. Players can reassign roles before rematch, or owner can randomize teams.
- Minimum 4 players on teams required to start. Teams don't need to be equal size.
- Players choose a lobby team and role before start; owner can randomize assignments and override choices.
- Players can remain as spectators (not on a team) when the game starts.
- Room owner can add spectators to teams as seekers during an ongoing game.
- Only the room owner can start the game.
- Room owner can end an active game, returning all players to the lobby.

## Pause and Disconnection Handling

**Manual pause:**
- The room owner can pause the game at any time by clicking the "Pause" button.
- This is useful when someone needs a break or there's something to discuss.
- The timer stops immediately and the game enters paused state.

**Automatic pause:**
The game pauses automatically at **turn transitions** if the incoming team lacks required players:
- The team's hinter is disconnected (needed to give clue).
- The team has no connected seekers (needed to guess).
- The entire team is disconnected.

**When paused:**
- The turn timer stops.
- A banner displays the pause reason.
- Players can change their team/role assignments to fill vacant spots.
- The room owner sees a "Resume Game" button when conditions are met.

**Resuming:**
- The room owner clicks "Resume Game" once the paused team has at least one hinter and one seeker connected.
- The turn timer resets and the game continues.

**Player disconnection:**
- Leaving the room (navigation or tab close) marks the player as disconnected.
- The pause check only happens at turn boundaries, not in real-time.
- Players can rejoin by returning to the room with the same session.

**Owner transfer:**
- If the room owner disconnects for 30+ seconds, ownership transfers to another connected player.
- This short grace period balances allowing for quick reconnects while keeping the game flowing.
- If the owner explicitly leaves (clicks Leave Room), ownership transfers immediately.

**Stale player cleanup:**
- Disconnected players are automatically moved to spectators after 2 minutes.
- This frees up role slots and keeps the team list accurate.
- A system message notifies the room when this happens.

## Team Management

Team management operates in two modes based on game state:

**Open Mode** (Lobby, Paused, Game Over):
- Players can join any team as hinter (if slot is empty) or seeker
- Players can leave their team (become spectators)
- Room owner can remove any other player from their team (they become spectators)

**Restricted Mode** (Active Game — started, not paused, not over):
- Players cannot change their own team/role
- Only the room owner can add spectators to teams, and only as seekers (not hinter)
- Room owner cannot remove players from teams during active gameplay

| Action | Who | Lobby | Active | Paused | Game Over |
|--------|-----|-------|--------|--------|-----------|
| Join as Hinter | Self | ✅ | ❌ | ✅ | ✅ |
| Join as Seeker | Self | ✅ | ❌ | ✅ | ✅ |
| Leave Team | Self | ✅ | ❌ | ✅ | ✅ |
| Add Spectator | Owner | ✅ | ✅* | ✅ | ✅ |
| Remove from Team | Owner | ✅ | ❌ | ✅ | ✅ |

*During active game, owner can only add spectators as seekers (not hinter).

## Room Locking

The room owner can lock the room to prevent new players from joining:

**Behavior:**
- When locked, new players attempting to join see "Room is locked" error
- Existing players who disconnect can still rejoin (they have a player record)
- The owner can lock/unlock at any time (lobby, during game, paused, game over)

**UI:**
- Lock toggle button appears in lobby header for the room owner
- Lock indicator badge shows next to room code in header when locked
- Non-owners see the lock status but cannot change it

**Future consideration:** Room locking (joinability) is separate from room visibility (public/private). A public room can be locked (visible but not joinable), and a private room can be unlocked (not visible but joinable via direct link).

If we introduce deviations or house rules, list them here explicitly.
