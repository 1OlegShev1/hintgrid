"use client";

import GameBoard from "@/components/GameBoard";
import ChatLog from "@/components/ChatLog";
import ClueHistory from "@/components/ClueHistory";
import {
  GameStatusPanel,
  TeamLobby,
  CompactTeams,
} from "@/components/room";
import type { UseRtdbRoomReturn } from "@/hooks/useRtdbRoom";
import type { UseRoomDerivedStateReturn } from "@/hooks/useRoomDerivedState";

interface GameViewProps {
  room: UseRtdbRoomReturn;
  derived: UseRoomDerivedStateReturn;
  timer: {
    timeRemaining: number | null;
  };
  overlays: {
    clueAnimating: boolean;
    showGameOver: boolean;
  };
}

/**
 * Active game view - displays when game is in progress.
 * Includes game board, chat, status panel, and team info.
 */
export function GameView({ room, derived, timer, overlays }: GameViewProps) {
  const { gameState, players, currentPlayer, messages, chatInput, setChatInput } = room;
  const { isMyTurn, isRoomOwner, canVote, canGiveClue, requiredVotes, turnGlowClass } = derived;

  if (!gameState) return null;

  return (
    <>
      <GameStatusPanel
        gameState={gameState}
        timeRemaining={timer.timeRemaining}
        isMyTurn={isMyTurn}
        isRoomOwner={isRoomOwner}
        canGiveClue={canGiveClue}
        clueAnimating={overlays.clueAnimating}
        players={players}
        showGameOverOverlay={overlays.showGameOver}
        onEndTurn={room.handleEndTurn}
        onEndGame={room.handleEndGame}
        onResumeGame={room.handleResumeGame}
        onRematch={room.handleRematch}
        onGiveClue={room.handleGiveClue}
      />

      {/* Game Over - Show Teams for Reassignment (above board) */}
      {gameState.gameOver && !overlays.showGameOver && (
        <div className="mb-4">
          <TeamLobby
            players={players}
            currentPlayer={currentPlayer}
            isRoomOwner={isRoomOwner}
            gameState={gameState}
            onSetRole={room.handleSetLobbyRole}
            onRandomize={room.handleRandomizeTeams}
            onStartGame={room.handleStartGame}
            onTurnDurationChange={room.handleTurnDurationChange}
            onWordPackChange={room.handleWordPackChange}
            showControls={true}
          />
        </div>
      )}

      {/* Board and Chat */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 ${turnGlowClass}`}>
            <GameBoard
              board={gameState.board}
              currentPlayer={currentPlayer}
              cardVotes={gameState.cardVotes}
              currentPlayerId={currentPlayer?.id ?? null}
              requiredVotes={requiredVotes}
              canVote={canVote}
              onVoteCard={room.handleVoteCard}
              onConfirmReveal={room.handleConfirmReveal}
            />
            
            {/* Player/Team indicator below board - only show if player has team */}
            {currentPlayer?.team && currentPlayer?.role && (
              <div className="mt-4 flex justify-center">
                <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl border-2 shadow-sm ${
                  currentPlayer.team === "red" 
                    ? "bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600" 
                    : "bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600"
                }`}>
                  <span className={`text-xs font-medium uppercase tracking-wide ${
                    currentPlayer.team === "red" ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"
                  }`}>
                    You are
                  </span>
                  <span className={`font-bold text-lg ${
                    currentPlayer.team === "red" ? "text-red-700 dark:text-red-200" : "text-blue-700 dark:text-blue-200"
                  }`}>
                    {currentPlayer.team.toUpperCase()} {currentPlayer.role === "clueGiver" ? "Clue Giver" : "Guesser"}
                  </span>
                  <span className={`text-sm ${
                    currentPlayer.team === "red" ? "text-red-600 dark:text-red-300" : "text-blue-600 dark:text-blue-300"
                  }`}>
                    ({currentPlayer.name})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <ClueHistory clues={messages} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <ChatLog messages={messages} players={players} />
            <form onSubmit={room.handleSendMessage} className="mt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Show compact teams only during active game, not on game over */}
      {!gameState.gameOver && (
        <CompactTeams 
          players={players} 
          currentPlayerId={currentPlayer?.id}
          isRoomOwner={isRoomOwner}
          onAddSpectator={(team, playerId) => room.handleSetLobbyRole(team, "guesser", playerId)}
        />
      )}

      {/* Game Paused - Show Teams for Role Reassignment */}
      {gameState.paused && !gameState.gameOver && (
        <TeamLobby
          players={players}
          currentPlayer={currentPlayer}
          isRoomOwner={isRoomOwner}
          gameState={gameState}
          onSetRole={room.handleSetLobbyRole}
          onRandomize={room.handleRandomizeTeams}
          onStartGame={room.handleStartGame}
          onTurnDurationChange={room.handleTurnDurationChange}
          onWordPackChange={room.handleWordPackChange}
          onResumeGame={room.handleResumeGame}
          showControls={true}
        />
      )}
    </>
  );
}
