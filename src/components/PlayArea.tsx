'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import Chessboard from '@/components/Chessboard';
import { useGameContext } from '@/context/GameContext';
import { useAuth } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import { ConfirmationOptions } from '@/context/GameContext';

// Define type for captured pieces state
type CapturedPieces = { w: PieceSymbol[]; b: PieceSymbol[] };

// This component now contains the logic that depends on useSearchParams
export default function PlayArea() {
  const { 
    isGameActive, 
    setIsGameActive, 
    setRequestConfirmationHandler,
    setSaveAndQuitHandler
  } = useGameContext();
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- State for Game Setup --- 
  const [isTimerEnabledForSetup, setIsTimerEnabledForSetup] = useState(false);
  const [timerMinutesForSetup, setTimerMinutesForSetup] = useState(5);

  // --- State for Active Game --- 
  const [game, setGame] = useState<Chess>(new Chess());
  const [whiteTime, setWhiteTime] = useState<number>(0); // In seconds
  const [blackTime, setBlackTime] = useState<number>(0); // In seconds
  const [, setIsTimerRunning] = useState<boolean>(false); // Keep setter, remove unused state var
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
  const closeConfirmationModal = useCallback(() => {
    setIsConfirmModalOpen(false);
    setConfirmationOptions(null);
  }, [setIsConfirmModalOpen, setConfirmationOptions]);

  const openConfirmationModal = useCallback((options: ConfirmationOptions) => {
    const wrappedActions = options.actions.map(action => ({
      ...action,
      onClick: () => {
        if (action.onClick) action.onClick();
        closeConfirmationModal(); 
      }
    }));
    setConfirmationOptions({ ...options, actions: wrappedActions });
    setIsConfirmModalOpen(true);
  }, [closeConfirmationModal]);

  // --- Game Logic Callbacks --- 
  const handleMove = useCallback((move: { from: Square; to: Square; promotion?: PieceSymbol }): boolean => {
    if (gameOverMessage) return false;
    const pieceOnTargetSquare = game.get(move.to);
    const pieceOnSourceSquare = game.get(move.from);
    if (pieceOnTargetSquare && pieceOnSourceSquare && pieceOnTargetSquare.color === pieceOnSourceSquare.color) {
      return false;
    }
    const testGame = new Chess();
    const historySAN = game.history();
    try {
      historySAN.forEach(san => testGame.move(san));
    } catch {
      return false;
    }
    let moveResult: Move | null = null;
    try {
      moveResult = testGame.move(move);
      if (moveResult) {
        setGame(testGame);
        setLastMove({ from: moveResult.from, to: moveResult.to });
        if (moveResult.captured) {
          const capturedColor = moveResult.color === 'w' ? 'b' : 'w';
          setCapturedPieces(prev => {
            const newCaptured = { ...prev };
            newCaptured[capturedColor] = [...newCaptured[capturedColor], moveResult!.captured as PieceSymbol].sort();
            return newCaptured;
          });
        }
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }, [game, gameOverMessage]);

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

  useEffect(() => {
    const fenToLoad = searchParams.get('fen');
    const gameIdToLoad = searchParams.get('gameId');
    if (fenToLoad && gameIdToLoad && !isGameActive) {
      try {
        const newGame = new Chess();
        const movesString = searchParams.get('moves');
        if (movesString) {
          const movesToApply = movesString.split(',');
          movesToApply.every((move) => {
            if (move) {
              let result: Move | null = null;
              try {
                result = newGame.move(move);
              } catch (moveError: unknown) {
                if (moveError instanceof Error && moveError.message.startsWith('Invalid move:')) {
                  return false;
                } else {
                  throw new Error(`Error processing move history: ${moveError instanceof Error ? moveError.message : moveError}`);
                }
              }
              if (!result) {
                return false;
              }
            }
            return true;
          });
        }
        setGame(newGame);
        setIsGameActive(true);
        setResumedGameId(gameIdToLoad);
        const timerEnabled = searchParams.get('isTimerEnabled') === 'true';
        setActiveGameTimerEnabled(timerEnabled);
        if (timerEnabled) {
          const wt = parseInt(searchParams.get('whiteTime') || '0', 10);
          const bt = parseInt(searchParams.get('blackTime') || '0', 10);
          setWhiteTime(wt);
          setBlackTime(bt);
        }
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
        setGameOverMessage(null);
        setKingInCheckSquare(null);
        setLastMove(history.length > 0 ? { from: history[history.length - 1].from, to: history[history.length - 1].to } : null);
        setSaveError(null);
        setIsSaving(false);
      } catch {
        setIsGameActive(false);
      }
    }
  }, [searchParams, isGameActive, setIsGameActive]); // Added dependencies

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
  }, [isGameActive, activeGameTimerEnabled, gameOverMessage, game, setIsTimerRunning]); // Added setIsTimerRunning

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
      else { message = "Game Over!"; }
    } else if (activeGameTimerEnabled) {
      if (whiteTime <= 0) { isGameOver = true; message = "Time's up! Black wins."; }
      else if (blackTime <= 0) { isGameOver = true; message = "Time's up! White wins."; }
    }
    if (!isGameOver && game.inCheck()) {
      checkSquare = findKingSquare(game, game.turn());
    }
    setGameOverMessage(message);
    setKingInCheckSquare(checkSquare);
  }, [game, whiteTime, blackTime, activeGameTimerEnabled, findKingSquare]);

  const confirmationMessage = "Are you sure you want to leave? Your game progress might be lost.";
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (isGameActive) { event.preventDefault(); event.returnValue = confirmationMessage; return confirmationMessage; }
  }, [isGameActive]);
  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [handleBeforeUnload]);

  useEffect(() => { return () => { setIsGameActive(false); }; }, [setIsGameActive]);

  const quitWithoutSaving = useCallback(() => {
    setIsGameActive(false);
    setResumedGameId(null);
    closeConfirmationModal();
  }, [setIsGameActive, closeConfirmationModal]); // Added closeConfirmationModal dependency

  const saveAndQuit = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    closeConfirmationModal();
    if (!userId) {
      setSaveError("You must be logged in to save games.");
      setIsSaving(false);
      return;
    }
    const gameState = { 
      fen: game.fen(), 
      moves: game.history(),
      whiteTime: activeGameTimerEnabled ? whiteTime : null, 
      blackTime: activeGameTimerEnabled ? blackTime : null, 
      isTimerEnabled: activeGameTimerEnabled, 
      isGameOver: gameOverMessage !== null 
    };
    const isUpdate = resumedGameId !== null;
    const apiUrl = isUpdate ? `/api/games/${resumedGameId}` : '/api/games/save';
    const method = isUpdate ? 'PATCH' : 'POST';
    try {
      const response = await fetch(apiUrl, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gameState) });
      if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || 'Failed to save game'); }
      setIsGameActive(false);
      setResumedGameId(null);
      router.push('/profile');
    } catch (error) {
      //console.error("Save failed:", error);
      setSaveError(error instanceof Error ? error.message : 'Unknown save error');
    } finally {
      setIsSaving(false);
    }
  }, [userId, game, activeGameTimerEnabled, whiteTime, blackTime, gameOverMessage, resumedGameId, setIsGameActive, closeConfirmationModal, router]);

  useEffect(() => {
    setRequestConfirmationHandler(openConfirmationModal);
    setSaveAndQuitHandler(saveAndQuit);
    return () => {
      setRequestConfirmationHandler(null);
      setSaveAndQuitHandler(null);
    };
  }, [setRequestConfirmationHandler, openConfirmationModal, setSaveAndQuitHandler, saveAndQuit]);

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
      openConfirmationModal({
        title: "Quit Game?", message: "Do you want to save your progress before quitting?",
        actions: [
          { label: "Cancel", onClick: closeConfirmationModal, variant: 'default' },
          { label: "Quit without Saving", onClick: quitWithoutSaving, variant: 'secondary' },
          { label: "Save and Quit", onClick: saveAndQuit, variant: 'primary' },
        ]
      });
    } else {
      openConfirmationModal({
        title: "Quit Game?", message: "Your game progress will be lost as you are not signed in. Are you sure you want to quit?",
        actions: [
          { label: "Cancel", onClick: closeConfirmationModal, variant: 'default' },
          { label: "Quit Game", onClick: quitWithoutSaving, variant: 'danger' },
        ]
      });
    }
  };

  // --- Render Logic --- 

  if (!isGameActive) {
    // Render Game Setup UI
    return (
      <main className="flex flex-grow flex-col items-center justify-center p-4 sm:p-6 gap-6">
        <div className="bg-[rgb(var(--card-bg-rgb))] dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg flex flex-col gap-4 items-center w-full max-w-xs sm:max-w-sm border border-[rgb(var(--card-border-rgb))] dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-2 text-[rgb(var(--foreground-rgb))]">Game Setup</h2>
          <div className="flex items-center gap-2 self-start">
            <input type="checkbox" id="timer-enable" checked={isTimerEnabledForSetup} onChange={(e) => setIsTimerEnabledForSetup(e.target.checked)} className="w-4 h-4 text-blue-600 dark:text-blue-500 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
            <label htmlFor="timer-enable" className="text-md sm:text-lg text-[rgb(var(--foreground-rgb))]">Enable Timer?</label>
          </div>
          {isTimerEnabledForSetup && (
            <div className="flex items-center gap-2 self-start w-full justify-between">
              <label htmlFor="timer-minutes" className="text-md sm:text-lg text-[rgb(var(--foreground-rgb))]">Time (min):</label>
              <input type="number" id="timer-minutes" min="1" max="60" value={timerMinutesForSetup} onChange={(e) => setTimerMinutesForSetup(parseInt(e.target.value, 10) || 1)} className="w-16 sm:w-20 p-1 sm:p-2 rounded bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-400 dark:border-gray-500 focus:ring-blue-500 focus:border-blue-500"/>
            </div>
          )}
          <button onClick={handleStartGame} className="mt-4 px-5 py-2 sm:px-6 sm:py-3 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white dark:text-gray-100 rounded-lg text-md sm:text-lg font-semibold transition-colors duration-200 transform hover:scale-105 w-full shadow-md">
            Start Game
          </button>
          <Link href="/" className="mt-2 text-center w-full px-5 py-2 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white dark:text-gray-200 rounded-lg text-md font-semibold transition-colors duration-200 transform hover:scale-105">
             Back to Home
          </Link>
        </div>
      </main>
    );
  }

  // Render Active Game UI
  return (
    <main className="flex flex-grow flex-col items-center justify-center p-2 sm:p-4 md:p-6 gap-4">
      {confirmationOptions && (
        <ConfirmationModal isOpen={isConfirmModalOpen} onClose={closeConfirmationModal} title={confirmationOptions.title} message={confirmationOptions.message} actions={confirmationOptions.actions}/>
      )}
      {isSaving && <p className="text-blue-500">Saving...</p>}
      {saveError && <p className="text-red-500">Error: {saveError}</p>}
      <Chessboard game={game} onMove={handleMove} whiteTime={whiteTime} blackTime={blackTime} isTimerEnabled={activeGameTimerEnabled} gameOverMessage={gameOverMessage} kingInCheckSquare={kingInCheckSquare} lastMove={lastMove} capturedPieces={capturedPieces}/>
      <button onClick={handleQuitGame} disabled={isSaving} className={`mt-2 sm:mt-4 px-5 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white dark:text-gray-100 rounded-lg text-md font-semibold transition-colors duration-200 transform hover:scale-105 shadow-md ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {isSaving ? 'Saving...' : 'Quit Game'}
      </button>
    </main>
  );
} 