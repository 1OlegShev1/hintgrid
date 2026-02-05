# Documentation Index

Start here to understand the project documentation.

## Documentation Files

| File | Topics Covered |
|------|----------------|
| [`RULES.md`](RULES.md) | Game rules, clue validation, turn mechanics, pause/disconnect handling |
| [`STATE.md`](STATE.md) | Firebase data model, room lifecycle, turn flow, client-side state, sound system, architecture, **testing strategy & conventions** |

## Future Plans

Ideas parked for later development:

| File | Feature |
|------|---------|
| [`future/IMAGE-MODE.md`](future/IMAGE-MODE.md) | Image-based game mode (Codenames Pictures style) |

## Architecture Overview

Every file in the project, grouped by directory.

### `app/` — Next.js App Router pages

| File | Purpose |
|------|---------|
| `globals.css` | Theme CSS variables + Tailwind v4 |
| `icon.svg` | Favicon |
| `layout.tsx` | Root layout with all context providers |
| `page.tsx` | Home page (create/join room, public room list) |
| `room/[[...code]]/page.tsx` | Room page (server component, catch-all route) |
| `room/[[...code]]/RoomClient.tsx` | Main room orchestrator — thin client that composes hooks and views |

### `components/` — React components

| File | Purpose |
|------|---------|
| `AvatarPicker.tsx` | Emoji avatar selection grid |
| `ChatLog.tsx` | IRC-style chat log with reactions and auto-scroll toggle |
| `ClueHistory.tsx` | Game log (clues and reveals) |
| `ConnectionIndicator.tsx` | Offline/online badge in Navbar |
| `ErrorBoundary.tsx` | React error boundary for graceful failures |
| `GameBoard.tsx` | 5×5 word grid with keyboard navigation and ARIA roles |
| `GameContext.tsx` | Room-level state flags for Navbar warnings |
| `GameStats.tsx` | Score display (cards remaining per team) |
| `HelpContent.tsx` | Help/rules content |
| `HelpModal.tsx` | Help modal wrapper |
| `Navbar.tsx` | Top navigation bar |
| `OfflineBanner.tsx` | Full-width offline warning |
| `SoundToggle.tsx` | Volume/mute control |
| `ThemeBackground.tsx` | Theme-specific background effects (synthwave sun/grid) |
| `ThemeProvider.tsx` | Theme mode (light/dark/system) and style (classic/synthwave) |
| `TransitionOverlay.tsx` | Game start / turn change / game over animations |
| `icons/CardBackIcons.tsx` | SVG icons for card backs |

### `components/ui/` — Design system primitives

| File | Purpose |
|------|---------|
| `Button.tsx` | Primary, secondary, danger, success, warning, ghost variants with sizes |
| `Card.tsx` | Content containers (default, elevated, ghost, team colors) |
| `Modal.tsx` | `Modal` and `ConfirmModal` dialog overlays with icon support |
| `Input.tsx` | `Input` and `Textarea` form controls with labels/errors |
| `Badge.tsx` | Status indicators and labels |
| `TeamIndicator.tsx` | Team color utilities (`getTeamClasses`, `getTeamTextClass`, etc.) |
| `index.ts` | Barrel export for all UI primitives |

### `components/room/` — Room-specific components

| File | Purpose |
|------|---------|
| `GameView.tsx` | Active game UI (board + sidebar with game log and chat) |
| `LobbyView.tsx` | Pre-game lobby UI (team selection + chat) |
| `TeamLobby.tsx` | Team selection panel — composes sub-components from `lobby/` |
| `CompactTeams.tsx` | Compact team roster shown during active game |
| `GameStatusPanel.tsx` | Turn info, clue input, pause/end controls, game-over panel |
| `ClueInput.tsx` | Clue word + count input with board-word validation |
| `ConnectionStatus.tsx` | Loading skeleton + error states for room connection |
| `JoinRoomForm.tsx` | Name + avatar form shown before entering a room |
| `RoomHeader.tsx` | Room code, name, lock toggle, player count |
| `EmojiPickerButton.tsx` | Full emoji picker dropdown for chat input |
| `MessageReactions.tsx` | Reaction display and picker for chat messages |
| `IdleWarningModal.tsx` | "Are you still there?" idle timeout modal |
| `RoomClosedModal.tsx` | Modal shown when room is deleted/closed |
| `index.ts` | Barrel export for room components |

### `components/room/lobby/` — Extracted lobby sub-components

| File | Purpose |
|------|---------|
| `WordPackDropdown.tsx` | Word pack multi-select dropdown |
| `CustomWordsDropdown.tsx` | Custom words textarea dropdown |
| `TimerDropdown.tsx` | Timer preset picker dropdown |
| `TeamCard.tsx` | Single team card (hinter slot + seeker list) |
| `PlayerGrid.tsx` | "All Players" grid showing everyone including spectators |
| `useDropdown.ts` | Shared hook for dropdown state, click-outside, scroll lock |

### `contexts/` — React context providers

| File | Purpose |
|------|---------|
| `AuthContext.tsx` | Firebase Anonymous Auth, provides `uid` |
| `ErrorContext.tsx` | Global error toast notifications |
| `SoundContext.tsx` | Sound effects, background music, volume control |

### `hooks/` — Custom React hooks

| File | Purpose |
|------|---------|
| `useRtdbRoom.ts` | Main room hook — composes `room/*` hooks, returns grouped API (`state`, `connection`, `chat`, `actions`) |
| `useRoomDerivedState.ts` | Computed state (`isMyTurn`, `canVote`, `canGiveClue`, etc.) |
| `useGameTimer.ts` | Turn countdown timer; only owner (or fallback) triggers timeout |
| `useTransitionOverlays.ts` | Game start / turn change / game over animation state |
| `useTimerSound.ts` | Timer tick sounds based on time remaining |
| `useIdleTimeout.ts` | 1-hour idle timeout in lobby |
| `useFirebaseConnection.ts` | Firebase `.info/connected` listener |
| `useAudioUnlock.ts` | Browser audio context unlock on user interaction |
| `useMusicPlayer.ts` | Background music playback via Howler.js (fade, track switching, iOS workaround) |
| `usePrefersReducedMotion.ts` | Detects OS reduced motion preference |

### `hooks/room/` — Room-specific hooks (composed by `useRtdbRoom`)

| File | Purpose |
|------|---------|
| `useRoomConnection.ts` | Firebase listeners, presence management, player state |
| `usePresenceRestore.ts` | Restores player presence after Firebase reconnection |
| `useOwnerReassignment.ts` | Owner transfer with grace period retry scheduling |
| `useGameActions.ts` | Game action handlers (vote, reveal, clue, start, pause, etc.) |
| `useChatActions.ts` | Chat send, emoji picker, reactions |
| `constants.ts` | Timeout constants (`DISCONNECT_BEHAVIOR_DEBOUNCE_MS`, `LEAVE_ROOM_DELAY_MS`, etc.) |
| `types.ts` | Firebase-to-client type transforms |
| `index.ts` | Barrel export |

### `lib/` — Firebase / infrastructure

| File | Purpose |
|------|---------|
| `firebase.ts` | Firebase app/auth/database initialization, test mode |
| `firebase-auth.ts` | Anonymous sign-in helper |
| `retry.ts` | `withRetry()` utility with exponential backoff |
| `utils.ts` | `cn()` utility for merging Tailwind classes |
| `rtdb/` | **All database operations** — see next section |

### `lib/rtdb/` — Database operations (split by domain)

All functions are re-exported through `lib/rtdb/index.ts`. Import via `@/lib/rtdb`.

| File | Exports | Purpose |
|------|---------|---------|
| `index.ts` | *(barrel)* | Re-exports everything from sub-modules |
| `helpers.ts` | `getDb`, `getServerTime`, `checkPause`, `votesToArray`, `arrayToVotes`, `clearGameMessages`, `pushSystemMessage`, `roomRef` | Internal shared helpers (not exported from barrel) |
| `room-management.ts` | `joinRoom`, `leaveRoom`, `deleteRoom`, `reassignOwnerIfNeeded`, `updateDisconnectBehavior`, `OWNER_DISCONNECT_GRACE_PERIOD_MS` | Room creation, joining, leaving, owner transfer |
| `game-lifecycle.ts` | `startGame`, `endGame`, `pauseGame`, `resumeGame`, `rematch` | Game phase transitions |
| `lobby-actions.ts` | `setLobbyRole`, `randomizeTeams`, `kickPlayer`, `setTimerPreset`, `setWordPack`, `setCustomWords`, `setRoomLocked`, `setRoomName` | Lobby settings and player management |
| `gameplay.ts` | `giveClue`, `voteCard`, `confirmReveal`, `endTurn` | In-game actions |
| `chat.ts` | `sendMessage`, `addReaction`, `removeReaction`, `pruneOldMessages` | Chat and message management |
| `public-rooms.ts` | `updatePublicRoomIndex`, `removeFromPublicRoomIndex`, `getPublicRooms`, `subscribeToPublicRooms`, `PublicRoomData` | Public room discovery index |
| `maintenance.ts` | `pruneStalePlayers` | Stale player cleanup |

### `shared/` — Pure logic (no React, no Firebase)

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript types — client (`Card`, `Player`, `GameState`, `ChatMessage`) and Firebase (`FirebaseBoardCard`, `FirebasePlayerData`, `FirebaseRoomData`) |
| `game-utils.ts` | Game logic: `getVoteThreshold`, `isValidClue`, `getClueValidationError`, board generation helpers |
| `validation.ts` | Input sanitization (`sanitizePlayerName`, `sanitizeClue`, etc.) and validation (`validatePlayerName`, `validateClueWord`) |
| `profanity.ts` | Profanity detection (`containsProfanity`) and censoring (`censorProfanity`) |
| `words.ts` | Word lists per pack and board generation (`generateBoard`) |
| `constants.ts` | All game config: timer presets, word packs, limits, localStorage keys, avatars |

### `tests/` — E2E tests (Playwright)

| File | Purpose |
|------|---------|
| `smoke.spec.ts` | Basic page load and room creation |
| `game-flow.spec.ts` | Full multiplayer game flow (create → join → play → win) |
| `test-utils.ts` | Shared Playwright helpers |
| `global-teardown.ts` | Test cleanup |

### `lib/__tests__/` — Unit and integration tests (Vitest)

| File | Purpose |
|------|---------|
| `retry.test.ts` | Unit tests for `lib/retry.ts` |
| `utils.test.ts` | Unit tests for `lib/utils.ts` |
| `setup/firebase-test-utils.ts` | Firebase emulator setup helpers |
| `setup/integration-helpers.ts` | Shared integration test setup (`setupIntegrationSuite`, `setupGameWith4Players`) |
| `rtdb/room-management.integration.test.ts` | Room creation, joining, leaving, owner transfer |
| `rtdb/lobby-actions.integration.test.ts` | Team assignment, kick/ban, randomize, room locking |
| `rtdb/game-lifecycle.integration.test.ts` | Start, end, pause, resume, rematch, auto-pause |
| `rtdb/gameplay.integration.test.ts` | Clue, vote, reveal, end turn, vote threshold, game outcomes |
| `rtdb/public-rooms.integration.test.ts` | Public room index CRUD and orphan cleanup |
| `rtdb/chat.integration.test.ts` | Message pruning thresholds |
| `rtdb/maintenance.integration.test.ts` | Stale player demotion and vote cleanup |

### `shared/__tests__/` — Unit tests for shared logic

| File | Purpose |
|------|---------|
| `constants.test.ts` | Timer preset and config validation |
| `game-utils.test.ts` | Vote threshold, clue validation, `getClueValidationError` |
| `profanity.test.ts` | Profanity detection and censoring |
| `validation.test.ts` | Input sanitization and validation |
| `words.test.ts` | Word list integrity and board generation |

### Root config files

| File | Purpose |
|------|---------|
| `next.config.js` | Next.js configuration |
| `tailwind.config.ts` | Tailwind CSS v4 config |
| `postcss.config.js` | PostCSS config |
| `tsconfig.json` | TypeScript config |
| `vitest.config.ts` | Unit test config (with coverage thresholds) |
| `vitest.integration.config.ts` | Integration test config (with coverage thresholds) |
| `playwright.config.ts` | E2E test config |
| `firebase.json` | Firebase hosting + emulator config |
| `.firebaserc` | Firebase project alias |
| `database.rules.json` | Firebase RTDB security rules |
| `.lintstagedrc.js` | Lint-staged config (pre-commit) |
| `.husky/pre-commit` | Husky pre-commit hook |

## When to Update

After implementing a feature, update the relevant doc:

| Change Type | Update |
|-------------|--------|
| Game rules or mechanics | `RULES.md` |
| Database schema or state changes | `STATE.md` (Data Model section) |
| New context provider or hook | `STATE.md` (Architecture section) **and** this file's hook table |
| New client-side storage (localStorage) | `STATE.md` (Client-Side State section) |
| Sound system changes | `STATE.md` (Sound System section) |
| New component | Add to this file's component table |
| New `lib/rtdb/` function | Add to this file's rtdb table **and** consider integration test |
| New test file | Add to this file's test table |
| New documentation file | Add entry to this `INDEX.md` |
