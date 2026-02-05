/**
 * Gameplay actions: give clue, vote, reveal, end turn.
 */

import {
  ref, get, update, push,
  serverTimestamp,
  runTransaction,
} from "firebase/database";
import { getDb, checkPause, type RoomData, type PlayerData } from "./helpers";
import { isValidClue, getRequiredVotes } from "@/shared/game-utils";
import { sanitizeClue, isValidClueFormat } from "@/shared/validation";

export async function giveClue(roomCode: string, playerId: string, word: string, count: number): Promise<void> {
  const sanitized = sanitizeClue(word);
  if (!isValidClueFormat(sanitized) || count < 0) throw new Error("Invalid clue");

  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);

  const [roomSnap, playerSnap] = await Promise.all([get(roomRef), get(playerRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");
  if (!playerSnap.exists()) throw new Error("Player not found");

  const roomData = roomSnap.val() as RoomData;
  const playerData = playerSnap.val() as PlayerData;

  if (!roomData.gameStarted || roomData.gameOver || roomData.currentClue) throw new Error("Cannot give clue now");
  if (playerData.role !== "clueGiver" || playerData.team !== roomData.currentTeam) throw new Error("Not your turn");

  const board = roomData.board || [];
  if (!isValidClue(sanitized, board.map((c) => c.word))) throw new Error("Invalid clue word");

  // Clear votes and set clue
  const updatedBoard = board.map((c) => ({ ...c, votes: {} }));

  // Build update object - mark team's first clue if this is it
  const clueUpdate: Record<string, unknown> = {
    currentClue: { word: sanitized.toUpperCase(), count },
    remainingGuesses: count + 1,
    turnStartTime: serverTimestamp(),
    board: updatedBoard,
  };
  
  // Mark that this team has given their first clue (for first clue bonus tracking)
  if (roomData.currentTeam === "red" && !roomData.redHasGivenClue) {
    clueUpdate.redHasGivenClue = true;
  } else if (roomData.currentTeam === "blue" && !roomData.blueHasGivenClue) {
    clueUpdate.blueHasGivenClue = true;
  }

  await update(roomRef, clueUpdate);

  await push(ref(db, `rooms/${roomCode}/messages`), {
    playerId,
    playerName: playerData.name,
    playerAvatar: playerData.avatar || "🐱",
    message: `${sanitized} ${count}`,
    timestamp: serverTimestamp(),
    type: "clue",
    clueTeam: roomData.currentTeam as "red" | "blue",
  });
}

export async function voteCard(roomCode: string, playerId: string, cardIndex: number): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  const votesRef = ref(db, `rooms/${roomCode}/board/${cardIndex}/votes`);

  // First validate player and game state (these don't need to be in the transaction)
  const [roomSnap, playerSnap] = await Promise.all([get(roomRef), get(playerRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");
  if (!playerSnap.exists()) throw new Error("Player not found");

  const roomData = roomSnap.val() as RoomData;
  const playerData = playerSnap.val() as PlayerData;

  if (!roomData.gameStarted || roomData.gameOver || !roomData.currentClue || (roomData.remainingGuesses ?? 0) <= 0) {
    throw new Error("Cannot vote now");
  }
  if (playerData.role !== "guesser" || playerData.team !== roomData.currentTeam) throw new Error("Not your turn");

  const board = roomData.board || [];
  if (cardIndex < 0 || cardIndex >= board.length || board[cardIndex].revealed) {
    throw new Error("Invalid card");
  }

  // Use transaction to atomically toggle the vote
  // This prevents race conditions when multiple players vote simultaneously
  await runTransaction(votesRef, (currentVotes) => {
    const votes = currentVotes || {};
    
    // Toggle vote
    if (votes[playerId]) {
      delete votes[playerId];
    } else {
      votes[playerId] = true;
    }
    
    return votes;
  });
}

export async function confirmReveal(roomCode: string, playerId: string, cardIndex: number): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const cardRevealedRef = ref(db, `rooms/${roomCode}/board/${cardIndex}/revealed`);

  const [roomSnap, playerSnap, playersSnap] = await Promise.all([
    get(roomRef),
    get(playerRef),
    get(playersRef),
  ]);

  if (!roomSnap.exists()) throw new Error("Room not found");
  if (!playerSnap.exists()) throw new Error("Player not found");

  const roomData = roomSnap.val() as RoomData;
  const playerData = playerSnap.val() as PlayerData;
  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;

  if (!roomData.gameStarted || roomData.gameOver || !roomData.currentClue || (roomData.remainingGuesses ?? 0) <= 0) {
    throw new Error("Cannot reveal now");
  }
  if (playerData.role !== "guesser" || playerData.team !== roomData.currentTeam) throw new Error("Not your turn");

  const board = roomData.board || [];
  if (cardIndex < 0 || cardIndex >= board.length || board[cardIndex].revealed) {
    throw new Error("Invalid card");
  }

  const card = board[cardIndex];
  // Count all guessers on the team (not just connected) so threshold stays
  // consistent even if someone's connection temporarily drops
  const guessers = Object.values(playersData).filter(
    (p) => p.team === roomData.currentTeam && p.role === "guesser"
  );
  const required = getRequiredVotes(guessers.length);
  const voteCount = Object.keys(card.votes || {}).length;

  if (voteCount < required || !card.votes?.[playerId]) {
    throw new Error("Not enough votes");
  }

  // Use transaction to atomically claim the reveal (prevents race condition)
  // If two players try to reveal simultaneously, only one will succeed
  const transactionResult = await runTransaction(cardRevealedRef, (currentRevealed) => {
    if (currentRevealed === true) {
      // Card already revealed by another player - abort transaction
      return undefined;
    }
    return true;
  });

  if (!transactionResult.committed) {
    throw new Error("Card already revealed");
  }

  const isCorrect = card.team === roomData.currentTeam;
  const isTrap = card.team === "trap";
  // Count remaining team cards (excluding the one we're about to reveal)
  const remainingTeamCards = board.filter(
    (c, i) => c.team === roomData.currentTeam && !c.revealed && i !== cardIndex
  ).length;
  const newGuesses = (roomData.remainingGuesses ?? 1) - 1;

  // Build reveal message
  const revealMessage = card.word;

  // Update remaining card fields and game state
  // Note: revealed is already set to true by the transaction above
  const cardUpdate = {
    [`board/${cardIndex}/revealedBy`]: playerId,
    [`board/${cardIndex}/votes`]: {},
  };

  if (isTrap) {
    await update(roomRef, {
      ...cardUpdate,
      gameOver: true,
      winner: roomData.currentTeam === "red" ? "blue" : "red",
      currentClue: null,
      remainingGuesses: null,
      turnStartTime: null,
    });
  } else if (!isCorrect || newGuesses === 0) {
    const newTeam = roomData.currentTeam === "red" ? "blue" : "red";
    const pause = checkPause(playersData, newTeam, false);
    // Clear votes from all unrevealed cards when turn ends
    const boardVotesCleared: Record<string, null> = {};
    board.forEach((c, i) => {
      if (!c.revealed && i !== cardIndex) {
        boardVotesCleared[`board/${i}/votes`] = null;
      }
    });
    await update(roomRef, {
      ...cardUpdate,
      ...boardVotesCleared,
      currentTeam: newTeam,
      currentClue: null,
      remainingGuesses: null,
      turnStartTime: pause.paused ? null : serverTimestamp(),
      paused: pause.paused,
      pauseReason: pause.reason,
      pausedForTeam: pause.team,
    });
  } else if (remainingTeamCards === 0) {
    await update(roomRef, {
      ...cardUpdate,
      gameOver: true,
      winner: roomData.currentTeam,
      currentClue: null,
      remainingGuesses: null,
      turnStartTime: null,
    });
  } else {
    await update(roomRef, {
      ...cardUpdate,
      remainingGuesses: newGuesses,
    });
  }

  // Add reveal message (after board update)
  await push(ref(db, `rooms/${roomCode}/messages`), {
    playerId,
    playerName: playerData.name,
    playerAvatar: playerData.avatar || "🐱",
    message: revealMessage,
    timestamp: serverTimestamp(),
    type: "reveal",
    revealedTeam: card.team,
  });
}

export async function endTurn(roomCode: string): Promise<void> {
  const db = getDb();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  const [roomSnap, playersSnap] = await Promise.all([get(roomRef), get(playersRef)]);
  if (!roomSnap.exists()) throw new Error("Room not found");

  const roomData = roomSnap.val() as RoomData;
  if (!roomData.gameStarted || roomData.gameOver) throw new Error("Game not active");

  const playersData = (playersSnap.val() || {}) as Record<string, PlayerData>;
  const newTeam = roomData.currentTeam === "red" ? "blue" : "red";
  const pause = checkPause(playersData, newTeam, false);
  
  // Clear votes from all unrevealed cards using explicit paths
  const board = roomData.board || [];
  const votesCleared: Record<string, null> = {};
  board.forEach((c, i) => {
    if (!c.revealed) {
      votesCleared[`board/${i}/votes`] = null;
    }
  });

  await update(roomRef, {
    ...votesCleared,
    currentTeam: newTeam,
    currentClue: null,
    remainingGuesses: null,
    turnStartTime: pause.paused ? null : serverTimestamp(),
    paused: pause.paused,
    pauseReason: pause.reason,
    pausedForTeam: pause.team,
  });
}
