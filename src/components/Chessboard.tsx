'use client';

import React, { useState, useEffect } from 'react';
import { Chess, Square, PieceSymbol, Piece, Color } from 'chess.js';

// Shared constants and types can remain here or move to a separate types file
const pieceSymbols: { [key in PieceSymbol]: string } = {
  p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔',
};

const squareToIndex = (square: Square): { row: number; col: number } => {
  const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - parseInt(square.substring(1), 10);
  return { row, col };
};

const indexToSquare = (row: number, col: number): Square => {
  return `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}` as Square;
};

interface ChessboardProps {
  isTimerEnabled: boolean;
  initialTimeSeconds: number;
}

type CapturedPieces = { w: PieceSymbol[]; b: PieceSymbol[] };

// --- Component Start --- 
const Chessboard: React.FC<ChessboardProps> = ({ isTimerEnabled, initialTimeSeconds }) => {
  const [game, setGame] = useState(new Chess());
  // ... (all state variables: boardState, selectedSquare, possibleMoves, etc.) ...
  const [boardState, setBoardState] = useState(game.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);
  const [kingInCheckSquare, setKingInCheckSquare] = useState<Square | null>(null);
  const [whiteTime, setWhiteTime] = useState(initialTimeSeconds);
  const [blackTime, setBlackTime] = useState(initialTimeSeconds);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({ w: [], b: [] });

  // ... (all helper functions defined inside: findKingSquare) ...
  const findKingSquare = (color: Color): Square | null => {
    const board = game.board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === color) {
          return indexToSquare(i, j);
        }
      }
    }
    return null;
  };
  
  // ... (all useEffect hooks: Timer, Game Status) ...
  useEffect(() => { // Timer
    if (!isTimerEnabled || gameOverMessage) return;
    const timerInterval = setInterval(() => {
      if (game.turn() === 'w') {
        setWhiteTime(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            clearInterval(timerInterval);
            setGameOverMessage("Time's up! Black wins.");
            return 0;
          }
          return newTime;
        });
      } else {
        setBlackTime(prev => {
            const newTime = prev - 1;
            if (newTime <= 0) {
              clearInterval(timerInterval);
              setGameOverMessage("Time's up! White wins.");
              return 0;
            }
            return newTime;
          });
      }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [game, isTimerEnabled, gameOverMessage]);

  useEffect(() => { // Game Status
    let checkSquare: Square | null = null;
    let message: string | null = null;
    if (game.isGameOver()) {
       if (game.isCheckmate()) { message = `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins.`; checkSquare = findKingSquare(game.turn());
      } else if (game.isStalemate()) { message = "Stalemate! Draw.";
      } else if (game.isThreefoldRepetition()) { message = "Draw by Threefold Repetition.";
      } else if (game.isInsufficientMaterial()) { message = "Draw by Insufficient Material.";
      } else if (game.isDraw()) { message = "Draw.";
      } else { message = "Game Over!"; }
    } else { if (game.inCheck()) { checkSquare = findKingSquare(game.turn()); } }
    setGameOverMessage(message);
    setKingInCheckSquare(checkSquare);
  }, [boardState, game]);

  // ... (all core logic functions: getPiece, handleSquareClick, formatTime) ...
  const getPiece = (square: Square): React.ReactNode => {
    const piece = game.get(square);
    if (!piece) return null;
    const symbol = pieceSymbols[piece.type];
    // Use specific text colors for white/black pieces in light/dark modes
    const colorClass = piece.color === 'w' 
        ? 'text-gray-100 dark:text-gray-100' // White pieces: Light gray (visible on dark squares), same in dark mode
        : 'text-gray-800 dark:text-gray-300'; // Black pieces: Dark gray, light gray in dark mode
        
    // Add a subtle stroke/shadow for better definition, especially white on light squares
    const shadowStyle = piece.color === 'w' 
        ? { textShadow: '0 0 3px rgba(0,0,0,0.7)' } 
        : { textShadow: '0 0 2px rgba(255,255,255,0.5)' };

    return <span className={`${colorClass} text-3xl sm:text-4xl font-bold`} style={shadowStyle}>{symbol}</span>;
  };

  const handleSquareClick = (square: Square) => {
    if (gameOverMessage) return;
    if (selectedSquare) {
      if (square === selectedSquare) { setSelectedSquare(null); setPossibleMoves([]); return; }
      try {
        const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
        if (move) {
          setBoardState(game.board()); setSelectedSquare(null); setPossibleMoves([]); setLastMove({ from: move.from, to: move.to });
          if (move.captured) {
            const capturedColor = move.color === 'w' ? 'b' : 'w';
            setCapturedPieces(prev => ({ ...prev, [capturedColor]: [...prev[capturedColor], move.captured as PieceSymbol].sort() }));
          }
        } else {
          const piece = game.get(square);
          if (piece && piece.color === game.turn()) { setSelectedSquare(square); const moves = game.moves({ square, verbose: true }); setPossibleMoves(moves.map(m => m.to));
          } else { setSelectedSquare(null); setPossibleMoves([]); }
        }
      } catch (e) {
        const piece = game.get(square);
        if (!(e instanceof Error && e.message.startsWith('Invalid move') && piece && piece.color === game.turn())) { console.error("Error making move:", e); }
        if (piece && piece.color === game.turn()) { setSelectedSquare(square); const moves = game.moves({ square, verbose: true }); setPossibleMoves(moves.map(m => m.to));
        } else { setSelectedSquare(null); setPossibleMoves([]); }
      }
    } else {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setSelectedSquare(square); const moves = game.moves({ square, verbose: true }); setPossibleMoves(moves.map(m => m.to));
      } else { setSelectedSquare(null); setPossibleMoves([]); }
    }
  };

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // ... (render logic, including loop for squares and CapturedPiecesDisplay sub-component) ...
  const boardSize = 8;
  const squares = [];
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      const square = indexToSquare(i, j);
      const isDark = (i + j) % 2 !== 0;
      const isSelected = square === selectedSquare;
      const isPossibleMove = possibleMoves.includes(square);
      const isInCheck = square === kingInCheckSquare; 
      const isLastMoveFrom = lastMove?.from === square;
      const isLastMoveTo = lastMove?.to === square;
      const pieceContent = getPiece(square);

      const lightSquareBg = 'bg-green-100 dark:bg-emerald-800';
      const darkSquareBg = 'bg-green-700 dark:bg-emerald-600';
      const lastMoveLightBg = 'bg-yellow-300/60 dark:bg-yellow-400/40';
      const lastMoveDarkBg = 'bg-yellow-500/60 dark:bg-yellow-600/40';
      const checkBg = 'bg-red-500/70 dark:bg-red-600/60';
      const selectedBorder = 'border-4 border-blue-500 dark:border-blue-400';
      const possibleMoveBg = 'bg-blue-500 dark:bg-blue-400';

      squares.push(
        <div 
          key={`${i}-${j}`} 
          className={`
            w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 
            flex items-center justify-center cursor-pointer relative transition-colors duration-150 ease-in-out
            ${isInCheck ? checkBg :
              isLastMoveFrom || isLastMoveTo ? (isDark ? lastMoveDarkBg : lastMoveLightBg) :
              (isDark ? darkSquareBg : lightSquareBg)
            }
            ${isSelected ? selectedBorder : ''}
          `} 
          onClick={() => handleSquareClick(square)} 
          style={{ pointerEvents: gameOverMessage ? 'none' : 'auto' }}
        >
          {pieceContent}
          {isPossibleMove && (
            <div className={`absolute w-3 h-3 sm:w-4 sm:h-4 ${possibleMoveBg} rounded-full opacity-60 pointer-events-none`}></div>
          )}
        </div>
      );
    }
  }

  // Component to display captured pieces
  const CapturedPiecesDisplay: React.FC<{ pieces: PieceSymbol[], color: Color }> = ({ pieces, color }) => (
    <div className={`flex flex-wrap gap-1 p-2 min-h-[40px] border border-[rgb(var(--card-border-rgb))] rounded bg-[rgba(var(--card-bg-rgb),0.7)] dark:bg-gray-800/60 shadow-inner ${color === 'w' ? 'justify-start' : 'justify-end'} flex-grow`}>
      {pieces.length === 0 && (
        <span className="text-[rgb(var(--secondary-rgb))] dark:text-gray-500 text-sm italic self-center">No captures</span>
      )}
      {pieces.map((piece, index) => (
        <span 
          key={`${color}-${piece}-${index}`}
          className={`text-lg sm:text-xl text-[rgb(var(--foreground-rgb))]`}
          style={{ textShadow: '0 0 1px rgba(0,0,0,0.3)' }}
        >
          {pieceSymbols[piece]}
        </span>
      ))}
    </div>
  );

  // Timer display component
  const TimerDisplay: React.FC<{ time: number, isBlack: boolean }> = ({ time, isBlack }) => {
    // Add a subtle pulsing animation if time is low (e.g., < 30 seconds)
    const isLowTime = time < 30;
    const lowTimeClass = isLowTime ? 'animate-pulse' : '';

    return (
      <div className={`
        px-4 py-2 sm:px-5 sm:py-3  // Increased padding
        rounded-lg shadow-lg // Slightly larger shadow and rounding
        text-xl sm:text-2xl        // Larger text
        font-mono font-semibold     // Bolder font
        text-right 
        min-w-[90px] sm:min-w-[100px] // Slightly wider
        border border-black/10 dark:border-white/10 // Subtle border
        ${isBlack 
          ? 'bg-gradient-to-br from-gray-800 to-black text-white dark:from-gray-700 dark:to-black' // Dark gradient background for black timer
          : 'bg-gradient-to-br from-white to-gray-200 text-black dark:from-gray-200 dark:to-gray-400 dark:text-black' // Light gradient background for white timer
        }
        ${lowTimeClass} // Apply pulse animation if time is low
      `}>
        {formatTime(time)}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 md:gap-4 w-full px-2 sm:px-4">
      {/* Top row */}
      <div className="w-full flex justify-between items-stretch gap-2">
        <CapturedPiecesDisplay pieces={capturedPieces.w} color="w" />
        {isTimerEnabled && <TimerDisplay time={blackTime} isBlack={true} />} 
      </div>
      
      {/* Status Text - Use foreground color */}
      <div className="h-6 sm:h-8 text-[rgb(var(--foreground-rgb))] text-lg sm:text-xl font-semibold text-center">
        {gameOverMessage ? (
           <span className="text-red-500 dark:text-red-400 font-bold">{gameOverMessage}</span>
           ) : (<span>{game.turn() === 'w' ? "White's Turn" : "Black's Turn"}</span>)
        }
      </div>

      {/* Chessboard Grid - Use card border color */}
      <div className="grid grid-cols-8 w-[320px] h-[320px] sm:w-[448px] sm:h-[448px] md:w-[512px] md:h-[512px] border-2 sm:border-4 border-[rgb(var(--card-border-rgb))] dark:border-gray-600 shadow-lg relative">
        {squares}
        {gameOverMessage && (<div className="absolute inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center pointer-events-none"></div>)}
      </div>

      {/* Bottom row */}
      <div className="w-full flex justify-between items-stretch gap-2">
        {isTimerEnabled && <TimerDisplay time={whiteTime} isBlack={false} />} 
        <CapturedPiecesDisplay pieces={capturedPieces.b} color="b" />
      </div>
    </div>
  );
};
// --- Component End --- 

export default Chessboard; 