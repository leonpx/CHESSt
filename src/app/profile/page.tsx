'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SavedGameData } from '@/types'; // Import from the new types file

// Define a type for the saved game data received from the API
// interface SavedGameData { <-- Remove interface definition here
//   id: string;
//   name: string | null; 
//   fen: string;
//   moves: string[];
//   isGameOver: boolean; 
//   whiteTime: number | null;
//   blackTime: number | null;
//   isTimerEnabled: boolean;
//   updatedAt: string; // ISO string date
// }

export default function ProfilePage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [savedGames, setSavedGames] = useState<SavedGameData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renamingGameId, setRenamingGameId] = useState<string | null>(null);
  const [newGameName, setNewGameName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch games function (using useCallback for potential dependency optimization)
  const fetchGames = useCallback(async () => {
    // Check if already loading or if user/auth status isn't ready
    if (!isLoaded || !userId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/games/load');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || 'Failed to load games');
      }
      const data: SavedGameData[] = await response.json();
      setSavedGames(data);
    } catch (err) {
      console.error("Error loading saved games:", err);
      setError(err instanceof Error ? err.message : 'Could not load saved games');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, userId]); // Dependencies for useCallback

  useEffect(() => {
    // Initial fetch when component mounts and user is loaded
    if (isLoaded && userId) {
        fetchGames();
    }
    // Redirect if not logged in after loading
    else if (isLoaded && !userId) {
         router.push('/sign-in?redirect_url=/profile');
    }
  }, [userId, isLoaded, router, fetchGames]); // fetchGames is now a stable dependency

  const handleResumeGame = (gameData: SavedGameData) => {
    if (gameData.isGameOver) {
      alert("Cannot resume a finished game.");
      return;
    }
    // TODO: Implement logic to resume a game
    // console.log("Resuming game:", gameData.id, gameData.fen);
    // alert("Resume functionality not yet implemented."); 

    // Prepare data for query params
    const queryParams = new URLSearchParams({
      gameId: gameData.id,
      fen: gameData.fen,
      isTimerEnabled: String(gameData.isTimerEnabled),
      moves: gameData.moves.join(','), // Join moves array into a string
    });
    if (gameData.isTimerEnabled) {
      queryParams.set('whiteTime', String(gameData.whiteTime ?? 0));
      queryParams.set('blackTime', String(gameData.blackTime ?? 0));
    }

    // Navigate to the play page with game state
    router.push(`/play?${queryParams.toString()}`);
  };

  const startRename = (game: SavedGameData) => {
    setRenamingGameId(game.id);
    setNewGameName(game.name || "");
  };

  const cancelRename = () => {
    setRenamingGameId(null);
    setNewGameName("");
  };

  const handleRenameSubmit = async (gameId: string) => {
    const trimmedName = newGameName.trim();
    if (!trimmedName) {
      alert("Game name cannot be empty.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null); // Clear previous errors
    try {
      const response = await fetch(`/api/games/${gameId}`, { // Use the dynamic route
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || 'Failed to rename game');
      }

      // Optimistic UI update or re-fetch
      setSavedGames(prevGames => 
        prevGames.map(game => 
          game.id === gameId ? { ...game, name: trimmedName } : game
        )
      );
      cancelRename();

    } catch (err) {
        console.error("Rename failed:", err);
        setError(err instanceof Error ? err.message : 'Could not rename game');
        // Optionally, keep the rename input open on error
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (window.confirm("Are you sure you want to delete this saved game?")) {
      setIsSubmitting(true);
      setError(null); // Clear previous errors
      try {
          const response = await fetch(`/api/games/${gameId}`, { // Use the dynamic route
              method: 'DELETE',
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
              throw new Error(errorData.error || 'Failed to delete game');
          }

          // Update UI by removing the game
          setSavedGames(prevGames => prevGames.filter(g => g.id !== gameId));

      } catch (err) {
          console.error("Delete failed:", err);
          setError(err instanceof Error ? err.message : 'Could not delete game');
      } finally {
          setIsSubmitting(false);
      }
    }
  };

  if (!isLoaded || isLoading) {
    return <p className="text-center mt-10">Loading profile...</p>;
  }

  if (error) {
    return <p className="text-center mt-10 text-red-500">Error: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Your Games</h1>
      
      {savedGames.length === 0 ? (
        <p>You have no saved games yet.</p>
      ) : (
        <div className="space-y-4">
          {savedGames.map((game, index) => (
            <div key={game.id} className="p-4 border border-[rgb(var(--card-border-rgb))] rounded-lg shadow-sm bg-[rgb(var(--card-bg-rgb))] flex flex-col gap-4">
              {renamingGameId === game.id ? (
                // Rename Input View
                <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full'>
                  <input 
                    type="text"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    maxLength={16}
                    className="flex-grow p-2 border border-gray-400 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
                    placeholder="Enter new game name (max 16 chars)"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(game.id); if (e.key === 'Escape') cancelRename(); }}
                  />
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <button onClick={() => handleRenameSubmit(game.id)} disabled={isSubmitting} className={`px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                    <button onClick={cancelRename} disabled={isSubmitting} className={`px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>Cancel</button>
                  </div>
                </div>
              ) : (
                // Default Display View
                <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <h2 className="text-lg font-semibold break-all">{game.name || `Game ${index + 1}`}</h2> 
                      <button onClick={() => startRename(game)} className='text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'>
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className={`text-sm ${game.isGameOver ? 'text-gray-500' : 'text-green-600 dark:text-green-400'} font-medium`}>
                      {game.isGameOver ? 'Finished' : 'In Progress'}
                    </p>
                    <p className="text-xs text-[rgb(var(--secondary-rgb))] mt-1">
                      Saved: {new Date(game.updatedAt).toLocaleString()}
                    </p>
                    {game.isTimerEnabled && (
                      <p className="text-xs text-[rgb(var(--secondary-rgb))] mt-1">
                        Time: W {game.whiteTime ?? 'N/A'}s / B {game.blackTime ?? 'N/A'}s
                      </p>
                    )}
                    {/* <p className="font-mono text-xs break-all mt-1">FEN: {game.fen}</p> */}
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0 self-start sm:self-center">
                    {/* Resume Button: Only show if game is not over */}                    
                    {!game.isGameOver && (
                      <button 
                        onClick={() => handleResumeGame(game)}
                        disabled={isSubmitting} // Disable if another action is submitting
                        className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors whitespace-nowrap ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Resume Game
                      </button>
                    )}
                    {/* Replay Button: Always show */}  
                    <button
                      onClick={() => router.push(`/replay/${game.id}`)} // Navigate to replay page
                      disabled={isSubmitting}
                      className={`px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors whitespace-nowrap ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Show replay
                    </button>
                    {/* Delete Button */} 
                    <button 
                      onClick={() => handleDeleteGame(game.id)}
                      disabled={isSubmitting}
                      className={`px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Delete game"
                    >
                      {isSubmitting ? <span className="animate-spin h-4 w-4 border-t-2 border-white rounded-full"></span> : <TrashIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 