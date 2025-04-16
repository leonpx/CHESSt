'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import Chessboard from '@/components/Chessboard';
import { useGameContext } from '@/context/GameContext';
import { useAuth } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import { ConfirmationOptions, ConfirmationAction } from '@/context/GameContext';

// Define type for captured pieces state
type CapturedPieces = { w: PieceSymbol[]; b: PieceSymbol[] };

export default function PlayPage() {
  const { 
    isGameActive, 
    setIsGameActive, 
    setRequestConfirmationHandler,
    setSaveAndQuitHandler
  } = useGameContext();
  const { userId } = useAuth();
  const searchParams = useSearchParams();

  // --- State for Game Setup --- 
  const [isTimerEnabledForSetup, setIsTimerEnabledForSetup] = useState(false);
  const [timerMinutesForSetup, setTimerMinutesForSetup] = useState(5);

  // --- State for Active Game --- 
  const [game, setGame] = useState<Chess>(new Chess());
  const [whiteTime, setWhiteTime] = useState<number>(0); // In seconds
  const [blackTime, setBlackTime] = useState<number>(0); // In seconds
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);
  const [kingInCheckSquare, setKingInCheckSquare] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({ w: [], b: [] });
  const [activeGameTimerEnabled, setActiveGameTimerEnabled] = useState<boolean>(false); // Store if the *active* game uses timer
  const [resumedGameId, setResumedGameId] = useState<string | null>(null); // State for resumed game ID

  // --- State for Confirmation Modal --- 
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmationOptions, setConfirmationOptions] = useState<ConfirmationOptions | null>(null);

  // --- Saving State --- 
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // --- Local Confirmation Logic --- 
  const openConfirmationModal = useCallback((options: ConfirmationOptions) => {
    // Wrap actions to ensure modal closes
    const wrappedActions = options.actions.map(action => ({
      ...action,
      onClick: () => {
        // Execute the original action first (if any)
        if (action.onClick) {
          action.onClick();
        }
        // Always close the modal afterwards
        closeConfirmationModal(); 
      }
    }));

    setConfirmationOptions({ 
      ...options, 
      actions: wrappedActions 
    });
    setIsConfirmModalOpen(true);
  }, []);

  const closeConfirmationModal = () => {
    setIsConfirmModalOpen(false);
    setConfirmationOptions(null);
  };

  // --- Game Logic Callbacks --- 
  const handleMove = useCallback((move: { from: Square; to: Square; promotion?: PieceSymbol }): boolean => {
    if (gameOverMessage) return false;

    // Check if the target square has a piece of the same color
    const pieceOnTargetSquare = game.get(move.to);
    const pieceOnSourceSquare = game.get(move.from); // Assuming a piece exists here to be moved
    if (pieceOnTargetSquare && pieceOnSourceSquare && pieceOnTargetSquare.color === pieceOnSourceSquare.color) {
      // User clicked on another friendly piece, not a valid move destination
      // Optionally, you could update state here to select the new piece
      console.log("Clicked on a friendly piece, not a move.");
      return false; // Indicate the move was not made
    }

    // Create a temporary copy by replaying history to validate the move
    const testGame = new Chess();
    const historySAN = game.history();
    try {
        historySAN.forEach(san => testGame.move(san)); // Replay history to match current game state
    } catch (replayError) {
        console.error("Internal error: Failed to replay game history for move validation.", replayError);
        return false; // Should not happen if main 'game' state is valid
    }

    // Now, attempt the new move on the copy
    let moveResult: Move | null = null;
    try {
      moveResult = testGame.move(move); // Try the move on the copy

      if (moveResult) {
        // Move is valid! Update the main game state with the successful test copy
        setGame(testGame);

        // Update other related state
        setLastMove({ from: moveResult.from, to: moveResult.to });
        if (moveResult.captured) {
          const capturedColor = moveResult.color === 'w' ? 'b' : 'w';
          // Ensure capturedPieces state update logic handles potential state issues if needed
          setCapturedPieces(prev => { 
            const newCaptured = { ...prev };
            newCaptured[capturedColor] = [...newCaptured[capturedColor], moveResult!.captured as PieceSymbol].sort();
            return newCaptured;
          });
        }
        return true; // Move successful
      } else {
        // Move was illegal for the position (e.g., moving into check)
        console.log("Move considered illegal by chess.js (returned null):", move);
        return false;
      }
    } catch (e) {
      // Move had invalid format or other error (chess.js threw)
      console.warn("Invalid move attempted (chess.js error):", e);
      return false;
    }
  }, [game, gameOverMessage]);

  // --- Helper: Find King Square --- 
  const findKingSquare = useCallback((currentBoard: Chess, color: Color): Square | null => {
    const board = currentBoard.board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === color) {
          const col = String.fromCharCode('a'.charCodeAt(0) + j);
          const row = 8 - i;
          return `${col}${row}` as Square;
        }
      }
    }
    return null;
  }, []);

  // --- useEffect Hooks --- 

  // Effect to handle resuming a game from query params
  useEffect(() => {
    const fenToLoad = searchParams.get('fen');
    const gameIdToLoad = searchParams.get('gameId'); // Get gameId from params

    if (fenToLoad && gameIdToLoad && !isGameActive) { // Check for gameId too
      console.log("Attempting to resume game:", gameIdToLoad);
      try {
        // Start from the initial chess position
        const newGame = new Chess(); 
        const initialFen = newGame.fen(); // Store initial FEN if needed, though not strictly necessary here

        // Apply moves if provided (handle potential errors)
        const movesString = searchParams.get('moves');
        let invalidMoveEncountered = false; // Flag to indicate truncated history

        if (movesString) {
          const movesToApply = movesString.split(',');
          console.log("Applying moves:", movesToApply);

          // Use .every() to allow breaking the loop gracefully
          movesToApply.every((move, index) => {
            if (move) { // Ensure move is not empty string
              let result: Move | null = null; // Declare result outside try
              try {
                 result = newGame.move(move); // Apply SAN move
              } catch (moveError: any) {
                // Check if it's the specific "Invalid move" error from chess.js
                if (moveError instanceof Error && moveError.message.startsWith('Invalid move:')) {
                  console.warn(`Chess.js threw error for move "${move}" (index ${index}): ${moveError.message}. Stopping history application.`);
                  // Stop applying further moves
                  invalidMoveEncountered = true;
                  return false; // Stop the .every() loop
                } else {
                  // Handle other potential errors thrown by chess.js (e.g., ambiguous move format)
                  console.warn(`Unexpected error thrown while applying move "${move}" (index ${index}) during resume:`, moveError);
                  throw new Error(`Error processing move history: ${moveError instanceof Error ? moveError.message : moveError}`); 
                }
              }
              
              // Check if chess.js considered the move illegal *for the position* (returned null)
              if (!result) { 
                console.warn(`Chess.js considered move "${move}" (index ${index}) illegal for the current position. Stopping history application.`);
                // Stop applying further moves from this corrupted history
                invalidMoveEncountered = true;
                return false; // Stop the .every() loop
              } 
            }
            return true; // Continue the .every() loop
          });
        }

        // --- State Setting after successfully applying all moves ---

        // Log if history was cut short
        if (invalidMoveEncountered) {
          console.warn("Game history was truncated due to invalid/illegal moves found in saved data. Resuming from last valid state.");
        }

        // Set state based on loaded game and params
        setGame(newGame);
        setIsGameActive(true);
        setResumedGameId(gameIdToLoad); // Store the resumed game ID
        
        const timerEnabled = searchParams.get('isTimerEnabled') === 'true';
        setActiveGameTimerEnabled(timerEnabled);
        if (timerEnabled) {
          const wt = parseInt(searchParams.get('whiteTime') || '0', 10);
          const bt = parseInt(searchParams.get('blackTime') || '0', 10);
          setWhiteTime(wt);
          setBlackTime(bt);
        }

        // Re-calculate captured pieces based on loaded history
        const history = newGame.history({ verbose: true });
        const initialCaptured: CapturedPieces = { w: [], b: [] };
        const currentCaptured = history.reduce((acc, move) => {
          if (move.captured) {
            const capturedColor = move.color === 'w' ? 'b' : 'w';
            acc[capturedColor].push(move.captured as PieceSymbol);
            acc[capturedColor].sort();
          }
          return acc;
        }, initialCaptured);
        setCapturedPieces(currentCaptured);

        // Reset other relevant states
        setGameOverMessage(null); // Check will run in the other useEffect
        setKingInCheckSquare(null);
        setLastMove(history.length > 0 ? { from: history[history.length - 1].from, to: history[history.length - 1].to } : null);
        setSaveError(null);
        setIsSaving(false);

        console.log(`Game ${gameIdToLoad} resumed from query parameters.`);

      } catch (error) {
        console.error("Failed to resume game from query parameters:", error);
        // Only set inactive if it's not the specific InvalidMoveInData error we handled above
        // (Though we re-throw other errors which will land here)
        setIsGameActive(false); // Ensure game isn't active if loading failed
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount, searchParams isn't needed as dependency here for initial load

  // Timer Logic
  useEffect(() => {
    if (!isGameActive || !activeGameTimerEnabled || gameOverMessage) {
      setIsTimerRunning(false);
      return;
    }
    setIsTimerRunning(true);
    const timerInterval = setInterval(() => {
      const currentTurn = game.turn();
      if (currentTurn === 'w') {
        setWhiteTime(prev => (prev <= 0 ? 0 : prev - 1));
      } else {
        setBlackTime(prev => (prev <= 0 ? 0 : prev - 1));
      }
    }, 1000);

    return () => {
      clearInterval(timerInterval);
      setIsTimerRunning(false);
    }
  }, [isGameActive, activeGameTimerEnabled, gameOverMessage, game]);

  // Check Game Status (Checkmate, Stalemate, Draw, Check, Time)
  useEffect(() => {
    let checkSquare: Square | null = null;
    let message: string | null = null;
    let isGameOver = false;

    if (game.isGameOver()) {
      isGameOver = true;
      if (game.isCheckmate()) { message = `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins.`; checkSquare = findKingSquare(game, game.turn()); }
      else if (game.isStalemate()) { message = "Stalemate! Draw."; }
      else if (game.isThreefoldRepetition()) { message = "Draw by Threefold Repetition."; }
      else if (game.isInsufficientMaterial()) { message = "Draw by Insufficient Material."; }
      else if (game.isDraw()) { message = "Draw."; }
      else { message = "Game Over!"; } // Default game over reason
    } else if (activeGameTimerEnabled) {
      // Check for timeout only if the game isn't already over
      if (whiteTime <= 0) { isGameOver = true; message = "Time's up! Black wins."; }
      else if (blackTime <= 0) { isGameOver = true; message = "Time's up! White wins."; }
    }
    
    if (!isGameOver && game.inCheck()) {
      checkSquare = findKingSquare(game, game.turn());
    }

    setGameOverMessage(message);
    setKingInCheckSquare(checkSquare);

  }, [game, whiteTime, blackTime, activeGameTimerEnabled, findKingSquare]);

  // Navigation confirmation listeners
  const confirmationMessage = "Are you sure you want to leave? Your game progress might be lost.";
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (isGameActive) { event.preventDefault(); event.returnValue = confirmationMessage; return confirmationMessage; }
  }, [isGameActive]);
  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [handleBeforeUnload]);

  // Reset game state on unmount
  useEffect(() => { return () => { setIsGameActive(false); }; }, [setIsGameActive]);

  // --- Quit/Save Logic (Refactored) --- 
  const quitWithoutSaving = useCallback(() => {
    console.log("Quitting game without saving.");
    setIsGameActive(false);
    setResumedGameId(null); // Ensure we don't try to update a non-existent game
    closeConfirmationModal();
    // Optionally, redirect or clear state further
  }, [setIsGameActive]);

  const saveAndQuit = useCallback(async () => {
    console.log("Attempting to save and quit game...");
    setSaveError(null);
    setIsSaving(true);
    closeConfirmationModal(); // Close modal immediately

    if (!userId) {
      console.error("Save error: User not logged in.");
      setSaveError("You must be logged in to save games.");
      setIsSaving(false);
      // Consider reopening modal with an error message or showing inline
      return; 
    }

    const gameState = { 
      fen: game.fen(), 
      moves: game.history(), // Get move history
      whiteTime: activeGameTimerEnabled ? whiteTime : null, 
      blackTime: activeGameTimerEnabled ? blackTime : null, 
      isTimerEnabled: activeGameTimerEnabled, 
      isGameOver: gameOverMessage !== null // Determine if game is over
    };
    const isUpdate = resumedGameId !== null;
    const apiUrl = isUpdate ? `/api/games/${resumedGameId}` : '/api/games/save';
    const method = isUpdate ? 'PATCH' : 'POST';

    try {
      const response = await fetch(apiUrl, { 
        method: method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(gameState) 
      });
      if (!response.ok) { 
        const errorData = await response.json().catch(() => ({})); 
        throw new Error(errorData.error || 'Failed to save game'); 
      }
      console.log(isUpdate ? "Game updated successfully!" : "Game saved successfully!");
      setIsGameActive(false); // Quit after successful save
      setResumedGameId(null); // Reset resumed ID after successful save/update
    } catch (error) {
      console.error("Save failed:", error);
      setSaveError(error instanceof Error ? error.message : 'Unknown save error');
      // Keep game active if save failed? Or prompt user again?
      // For now, we just show the error message.
    } finally {
      setIsSaving(false);
    }
  }, [ 
    userId, game, activeGameTimerEnabled, whiteTime, blackTime, 
    gameOverMessage, resumedGameId, setIsGameActive
  ]);

  // --- Provide Handlers to Context --- 
  useEffect(() => {
    // Provide the function references to the context
    setRequestConfirmationHandler(openConfirmationModal);
    setSaveAndQuitHandler(saveAndQuit);

    // Cleanup: Remove the handlers when PlayPage unmounts
    return () => {
      setRequestConfirmationHandler(null);
      setSaveAndQuitHandler(null);
    };
    // Dependencies ensure the latest functions are provided if they change
  }, [setRequestConfirmationHandler, openConfirmationModal, setSaveAndQuitHandler, saveAndQuit]);

  // --- Start/Quit Game Handlers --- 
  const handleStartGame = () => {
    const newGame = new Chess();
    const useTimer = isTimerEnabledForSetup;
    const startTime = useTimer ? timerMinutesForSetup * 60 : Infinity;
    setGame(newGame);
    setWhiteTime(startTime);
    setBlackTime(startTime);
    setActiveGameTimerEnabled(useTimer);
    setGameOverMessage(null);
    setKingInCheckSquare(null);
    setLastMove(null);
    setCapturedPieces({ w: [], b: [] });
    setIsGameActive(true);
    setSaveError(null);
    setIsSaving(false);
  };

  const handleQuitGame = () => {
    if (userId) {
      // Logged-in user confirmation
      openConfirmationModal({
        title: "Quit Game?",
        message: "Do you want to save your progress before quitting?",
        actions: [
          { label: "Cancel", onClick: closeConfirmationModal, variant: 'default' },
          { label: "Quit without Saving", onClick: quitWithoutSaving, variant: 'secondary' },
          { label: "Save and Quit", onClick: saveAndQuit, variant: 'primary' },
        ]
      });
    } else {
      // Logged-out user confirmation
      openConfirmationModal({
        title: "Quit Game?",
        message: "Your game progress will be lost as you are not signed in. Are you sure you want to quit?",
        actions: [
          { label: "Cancel", onClick: closeConfirmationModal, variant: 'default' },
          { label: "Quit Game", onClick: quitWithoutSaving, variant: 'danger' },
        ]
      });
    }
  };

  // --- Render Logic --- 

  if (!isGameActive) {
    return (
      <main className="flex flex-grow flex-col items-center justify-center p-4 sm:p-6 gap-6">
        <div className="bg-[rgb(var(--card-bg-rgb))] dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg flex flex-col gap-4 items-center w-full max-w-xs sm:max-w-sm border border-[rgb(var(--card-border-rgb))] dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-2 text-[rgb(var(--foreground-rgb))]">Game Setup</h2>
          <div className="flex items-center gap-2 self-start">
            <input
              type="checkbox"
              id="timer-enable"
              checked={isTimerEnabledForSetup}
              onChange={(e) => setIsTimerEnabledForSetup(e.target.checked)}
              className="w-4 h-4 text-blue-600 dark:text-blue-500 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="timer-enable" className="text-md sm:text-lg text-[rgb(var(--foreground-rgb))]">Enable Timer?</label>
          </div>
          {isTimerEnabledForSetup && (
            <div className="flex items-center gap-2 self-start w-full justify-between">
              <label htmlFor="timer-minutes" className="text-md sm:text-lg text-[rgb(var(--foreground-rgb))]">Time (min):</label>
              <input 
                type="number"
                id="timer-minutes"
                min="1"
                max="60" 
                value={timerMinutesForSetup}
                onChange={(e) => setTimerMinutesForSetup(parseInt(e.target.value, 10) || 1)}
                className="w-16 sm:w-20 p-1 sm:p-2 rounded bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-400 dark:border-gray-500 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          <button
            onClick={handleStartGame}
            className="mt-4 px-5 py-2 sm:px-6 sm:py-3 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white dark:text-gray-100 rounded-lg text-md sm:text-lg font-semibold transition-colors duration-200 transform hover:scale-105 w-full shadow-md"
          >
            Start Game
          </button>
          <Link
            href="/"
            className="mt-2 text-center w-full px-5 py-2 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white dark:text-gray-200 rounded-lg text-md font-semibold transition-colors duration-200 transform hover:scale-105"
          >
             Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-grow flex-col items-center justify-center p-2 sm:p-4 md:p-6 gap-4">
      {/* Render the confirmation modal */} 
      {confirmationOptions && (
        <ConfirmationModal 
          isOpen={isConfirmModalOpen}
          onClose={closeConfirmationModal} // Basic close action
          title={confirmationOptions.title}
          message={confirmationOptions.message}
          actions={confirmationOptions.actions}
        />
      )}

      {isSaving && <p className="text-blue-500">Saving...</p>}
      {saveError && <p className="text-red-500">Error: {saveError}</p>}

      <Chessboard 
        game={game}
        onMove={handleMove}
        whiteTime={whiteTime}
        blackTime={blackTime}
        isTimerEnabled={activeGameTimerEnabled}
        gameOverMessage={gameOverMessage}
        kingInCheckSquare={kingInCheckSquare}
        lastMove={lastMove}
        capturedPieces={capturedPieces}
      />
      <button
        onClick={handleQuitGame}
        disabled={isSaving}
        className={`mt-2 sm:mt-4 px-5 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white dark:text-gray-100 rounded-lg text-md font-semibold transition-colors duration-200 transform hover:scale-105 shadow-md ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isSaving ? 'Saving...' : 'Quit Game'}
      </button>
    </main>
  );
} 