# Clue Cards

A multiplayer word guessing party game built with Next.js, TypeScript, and Firebase.

> **Disclaimer**: This is an independent fan project inspired by word-based party games. It is not affiliated with, endorsed by, or connected to any commercial board game publisher. This project was created for educational and personal use.

## Features

- Room-based multiplayer with room codes
- Real-time game synchronization via Firebase
- Clue Giver and Guesser roles
- Turn-based gameplay with timer
- Sound effects with volume control

## How It Works

Two teams compete to find all their words on a 5x5 grid. Each team has a **Clue Giver** who sees which words belong to which team, and **Guessers** who only see the words. First team to find all their words wins — but watch out for the trap card!

## Getting Started

```bash
npm install
cp .env.example .env.local   # Configure Firebase credentials
npm run dev                   # Start at http://localhost:3000
```

See `.env.example` for required Firebase configuration.

## Documentation

See [`docs/INDEX.md`](docs/INDEX.md) for documentation overview and file index.

## Testing

```bash
npm run test:run      # Unit tests
npm run test:e2e      # E2E tests (Playwright)
npm run typecheck     # TypeScript check
```

## License

This project is for educational and personal use only.
