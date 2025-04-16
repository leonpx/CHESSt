'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chess, Move } from 'chess.js';
import Chessboard from '@/components/Chessboard'; // Assuming Chessboard can be used read-only
import Link from 'next/link';
import { SavedGameData } from '@/types'; // Import from the new types file
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid'; // Example icons

// Helper to get the starting FEN from a FEN string representing a later position
// This is a basic implementation; a more robust one might be needed for complex scenarios
const getStartingFen = (fenWithMoves: string): string => {
  const parts = fenWithMoves.split(' ');
  if (parts.length >= 6) {
    // Reset move counters and potentially en passant square
    parts[2] = '-'; // Castling rights remain as they were at the start
    parts[3] = '-'; // Reset en passant
    parts[4] = '0'; // Reset halfmove clock
    parts[5] = '1'; // Reset fullmove number
    // Reconstruct the FEN representing the start of *this specific game*
    // NOTE: This assumes the initial saved FEN wasn't necessarily the true board start
    // A better approach might be to always save the *initial* FEN and the moves separately.
    // For now, we'll work with what we have.
    console.warn("Attempting to derive starting FEN; may not be 100% accurate for castling/en passant if game didn't start from initial position.");
    // Let's just load the saved FEN and undo all moves as a simpler approach for now
    return fenWithMoves; // Revisit this if needed
  }
  return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // Default start if FEN is invalid
};

export default function ReplayPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [gameData, setGameData] = useState<SavedGameData | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1); // -1 means initial position
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the chess instance for the current move index
  const chessInstance = useMemo(() => {
    if (!gameData) return null;
    
    // Create a base instance from the initial position (or derived start)
    const baseFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // Always start replay from standard start
    const game = new Chess(baseFen);

    // Apply moves up to the current index
    try {
        for (let i = 0; i <= currentMoveIndex; i++) {
            if (gameData.moves[i]) {
                game.move(gameData.moves[i]);
            }
        }
    } catch(e) {
        console.error("Error applying moves during replay construction:", e);
        // Handle error state? Maybe show message?
    }
    return game;
  }, [gameData, currentMoveIndex]);

  // Fetch game data on mount
  useEffect(() => {
    if (!gameId) return;
    setIsLoading(true);
    setError(null);

    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load game data');
        }
        const data: SavedGameData = await response.json();
        setGameData(data);
        // Start replay at the end by default
        setCurrentMoveIndex(data.moves.length - 1); 
      } catch (err) {
        console.error("Fetch game error:", err);
        setError(err instanceof Error ? err.message : 'Could not load game');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!gameData) return;
    if (event.key === 'ArrowLeft') {
      setCurrentMoveIndex(prev => Math.max(-1, prev - 1));
    } else if (event.key === 'ArrowRight') {
      setCurrentMoveIndex(prev => Math.min(gameData.moves.length - 1, prev + 1));
    }
  }, [gameData]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const goToMove = (index: number) => {
    if (!gameData) return;
    setCurrentMoveIndex(Math.max(-1, Math.min(gameData.moves.length - 1, index)));
  };

  if (isLoading) {
    return <p className="text-center mt-10">Loading replay...</p>;
  }

  if (error) {
    return <p className="text-center mt-10 text-red-500">Error: {error}</p>;
  }

  if (!chessInstance || !gameData) {
    return <p className="text-center mt-10">Could not load game data for replay.</p>;
  }

  const totalMoves = gameData.moves.length;
  const currentMoveNumber = Math.floor((currentMoveIndex + 1) / 2) + 1;
  const currentTurn = currentMoveIndex === -1 ? 'w' : (currentMoveIndex % 2 === 0 ? 'b' : 'w');
  const currentMoveSan = currentMoveIndex >= 0 ? gameData.moves[currentMoveIndex] : 'Start';

  return (
    <main className="flex flex-grow flex-col items-center justify-center p-2 sm:p-4 md:p-6 gap-4">
      <h1 className="text-2xl font-semibold mb-2">Replay of {gameData.name || `Game ${gameId.substring(0, 6)}...`}</h1>
      
      {/* Pass necessary props, potentially a readOnly prop if Chessboard supports it */}
      <Chessboard 
        game={chessInstance} 
        // onMove={() => {}} // Disable moving 
        allowMoves={false} // Add this prop to Chessboard to disable drag/click moves
        // Pass other props if needed, like orientation, piece theme etc.
        // whiteTime={null} // No timer in replay
        // blackTime={null}
        // isTimerEnabled={false}
        lastMove={currentMoveIndex >= 0 ? chessInstance.history({ verbose: true }).slice(-1)[0] : null}
      />

      <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-md">
        <div className="text-center font-mono">
            {/* Simplified move indicator */}
            {currentMoveIndex === -1 
                ? "Initial Position"
                : <span className='text-gray-500 dark:text-gray-400 text-sm'>({currentMoveIndex + 1}/{totalMoves})</span>
            }
        </div>
        <div className="flex justify-center items-center gap-4">
          <button 
            onClick={() => goToMove(-1)}
            disabled={currentMoveIndex === -1}
            className="px-3 py-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded disabled:opacity-50"
          >
            Start
          </button>
          <button 
            onClick={() => goToMove(currentMoveIndex - 1)}
            disabled={currentMoveIndex === -1}
            className="p-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded disabled:opacity-50"
            aria-label="Previous move"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <button 
            onClick={() => goToMove(currentMoveIndex + 1)}
            disabled={currentMoveIndex >= totalMoves - 1}
            className="p-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded disabled:opacity-50"
            aria-label="Next move"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
          <button 
            onClick={() => goToMove(totalMoves - 1)}
            disabled={currentMoveIndex >= totalMoves - 1}
            className="px-3 py-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded disabled:opacity-50"
          >
            End
          </button>
        </div>
      </div>

      <Link href="/profile" className="mt-4 text-blue-600 dark:text-blue-400 hover:underline">
        Back to My Games
      </Link>
    </main>
  );
} 