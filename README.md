# Clue Cards

A multiplayer word guessing party game built with Next.js, TypeScript, and Firebase.

> **Disclaimer**: This is an independent fan project inspired by word-based party games. It is not affiliated with, endorsed by, or connected to any commercial board game publisher. This project was created for educational and personal use.

## Features

- Anonymous player names (no authentication required)
- Room-based multiplayer with room codes
- Real-time game synchronization via Firebase Realtime Database
- Clue Giver and Guesser roles with different views
- Turn-based gameplay with timer
- Chat and clue logging
- 5x5 word grid with team colors

## How It Works

Two teams compete to find all their words on a 5x5 grid. Each team has a **Clue Giver** who can see which words belong to which team, and **Guessers** who can only see the words.

- The Clue Giver gives a one-word clue and a number indicating how many words relate to that clue
- Guessers discuss and vote on which words to reveal
- First team to find all their words wins - but watch out for the instant-loss card!

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project (free tier works)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Configure Firebase (see Environment Configuration below)

### Running the Application

1. **Start the Next.js dev server**:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

**For local development with Firebase emulators** (optional):
```bash
firebase emulators:start
npm run dev
```

### How to Play

1. Enter your name on the home page
2. Create a new room or join an existing one with a room code
3. Wait for at least 4 players to join
4. Click "Start Game" to begin
5. Players are assigned to Red and Blue teams with Clue Giver and Guesser roles
6. Clue Givers can see all card colors and give clues
7. Guessers vote on cards to reveal during their team's turn
8. First team to reveal all their cards wins (but avoid the instant-loss card!)

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `components/` - React components (GameBoard, ChatLog)
- `lib/` - Firebase configuration and Realtime Database actions
- `hooks/` - React hooks for game state management
- `shared/` - Shared TypeScript types and utilities
- `docs/` - Architecture, rules, and documentation

## Testing

### Unit Tests
```bash
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage report
```

### E2E Tests (Playwright)
```bash
npm run test:e2e         # Run E2E tests (headless)
npm run test:e2e:headed  # Run with visible browser
npm run test:e2e:ui      # Run with Playwright debug UI
```

E2E tests cover the full game flow with 4 players - room creation, team selection, game start, clue giving, and card reveals.

### Build Verification
```bash
npm run typecheck     # TypeScript check only
npm run test:build    # Full typecheck + build
```

## Environment Configuration

### Required Firebase Configuration

Set these environment variables in `.env.local`:

- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` - Realtime Database URL (e.g., `https://your-project-default-rtdb.firebaseio.com`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID

### Optional: Firebase Emulators (for local development)

- `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` - Auth emulator host (e.g., `localhost:9099`)
- `NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST` - Realtime Database emulator host (e.g., `localhost:9000`)

See `.env.example` for all available variables.

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Realtime Database (Build → Realtime Database → Create Database)
3. Deploy security rules: `firebase deploy --only database`
4. Copy your Firebase config to `.env.local` (include the `databaseURL`)

## License

This project is for educational and personal use only.
