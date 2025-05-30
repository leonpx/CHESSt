'use client';

import React, { useState } from 'react';
import Image from 'next/image'; // Import next/image
import { Chess, Square, PieceSymbol, Color } from 'chess.js';

const indexToSquare = (row: number, col: number): Square => {
  return `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}` as Square;
};

// --- Updated Props Interface --- 
interface ChessboardProps {
  game: Chess; // Receive game instance
  onMove?: (move: { from: Square; to: Square; promotion?: PieceSymbol }) => boolean; // Make optional for replay
  allowMoves?: boolean; // New prop to control interaction
  whiteTime?: number; // Make optional
  blackTime?: number; // Make optional
  isTimerEnabled?: boolean; // Make optional
  gameOverMessage?: string | null; // Make optional
  kingInCheckSquare?: Square | null; // Make optional
  lastMove?: { from: Square; to: Square } | null; // Make optional
  capturedPieces?: { w: PieceSymbol[]; b: PieceSymbol[] }; // Make optional
}

// --- Component Start --- 
const Chessboard: React.FC<ChessboardProps> = ({ 
  game, 
  onMove, 
  allowMoves = true, // Default to true
  whiteTime = 0,
  blackTime = 0,
  isTimerEnabled = false, 
  gameOverMessage = null, 
  kingInCheckSquare = null,
  lastMove = null,
  capturedPieces = { w: [], b: [] },
}) => {
  // Internal UI state only
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);

  // --- Core Logic Functions --- 
  const getPiece = (square: Square): React.ReactNode => {
    const piece = game.get(square); // Use passed game instance
    if (!piece) return null;

    // Construct the image path assuming images are in /public/pieces/
    const imageUrl = `/pieces/${piece.color}${piece.type}.png`;

    // Define alt text based on piece
    const pieceNames: { [key in PieceSymbol]: string } = {
      p: 'Pawn', r: 'Rook', n: 'Knight', b: 'Bishop', q: 'Queen', k: 'King'
    };
    const colorName = piece.color === 'w' ? 'White' : 'Black';
    const altText = `${colorName} ${pieceNames[piece.type]}`;

    return (
      // Wrapper div to control the size the fill image occupies
      <div className="relative w-3/4 h-3/4 sm:w-[80%] sm:h-[80%] sm:p-1 m-2 sm:m-0">
        <Image 
          src={imageUrl}
          alt={altText}
          fill // Use fill layout
          className="object-contain" // Keep object-contain
          draggable="false"
          unoptimized // Optional: If you DON'T want Vercel/Next.js optimization
        />
      </div>
    );
  };

  // Updated handleSquareClick to call parent's onMove
  const handleSquareClick = (square: Square) => {
    // Check allowMoves prop first
    if (!allowMoves || gameOverMessage) return; 
    
    if (selectedSquare) {
      if (square === selectedSquare) { 
        setSelectedSquare(null); 
        setPossibleMoves([]); 
        return; 
      }
      
      // Attempt move by calling the callback, only if onMove exists
      const moveSuccessful = onMove ? onMove({ from: selectedSquare, to: square, promotion: 'q' }) : false;
      
      // Reset internal UI state regardless of move success
      setSelectedSquare(null); 
      setPossibleMoves([]);
      
      // If move failed, check if the new square can be selected
      if (!moveSuccessful) {
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) { 
          setSelectedSquare(square); 
          const moves = game.moves({ square, verbose: true }); 
          setPossibleMoves(moves.map(m => m.to));
        }
      }
      // Parent (PlayPage) handles updating game state, boardState, lastMove etc. via onMove callback

    } else {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { // Check turn using passed game instance
        setSelectedSquare(square); 
        const moves = game.moves({ square, verbose: true }); 
        setPossibleMoves(moves.map(m => m.to));
      } else {
        setSelectedSquare(null); 
        setPossibleMoves([]);
      }
    }
  };

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // --- Render Logic --- 
  const lightSquareColor = '#eeeed2'; // Light buff/beige
  const darkSquareColor = '#769656'; // Dark green

  const lastMoveHighlightColor = '#BCC944'; // New color for last move highlight
  const checkHighlightColor = '#f05a5a'; // Opaque reddish highlight (hex equivalent of rgb(240, 90, 90))
  const selectedBorderColor = 'rgba(30, 144, 255, 0.9)'; // Dodger blue like
  const possibleMoveDotColor = 'rgba(0, 0, 0, 0.2)'; // Dark translucent dot

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

      // Determine background color
      let bgColor = isDark ? darkSquareColor : lightSquareColor;
      if (isInCheck) bgColor = checkHighlightColor;
      else if (isLastMoveFrom || isLastMoveTo) bgColor = lastMoveHighlightColor;

      // Determine border style
      const borderStyle = isSelected ? { boxShadow: `inset 0 0 0 4px ${selectedBorderColor}` } : {};

      // Determine text color for labels based on square color
      const labelColor = isDark ? 'text-gray-200/70' : 'text-gray-800/70';

      squares.push(
        <div 
          key={`${i}-${j}`} 
          className={`
            w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 
            flex items-center justify-center cursor-pointer relative 
          `}
          style={{ 
            backgroundColor: bgColor, 
            ...borderStyle, 
            transition: 'background-color 0.1s ease-in-out',
            pointerEvents: (!allowMoves || gameOverMessage) ? 'none' : 'auto'
          }}
          onClick={() => allowMoves && handleSquareClick(square)} // Only trigger click handler if moves are allowed
        >
          {/* Rank Label (Numbers on the left) */}
          {j === 0 && (
            <span className={`absolute top-0 left-1 text-xs font-bold ${labelColor} select-none pointer-events-none`}>
              {8 - i}
            </span>
          )}
          {/* File Label (Letters on the bottom) */}
          {i === 7 && (
            <span className={`absolute bottom-0 right-1 text-xs font-bold ${labelColor} select-none pointer-events-none`}>
              {String.fromCharCode('a'.charCodeAt(0) + j)}
            </span>
          )}
          {pieceContent}
          {isPossibleMove && (
            <div 
              className={`absolute w-1/3 h-1/3 rounded-full pointer-events-none`}
              style={{ backgroundColor: possibleMoveDotColor }}
            ></div>
          )}
        </div>
      );
    }
  }

  // Component to display captured pieces using CSS Sprites
  const CapturedPiecesDisplay: React.FC<{ pieces: PieceSymbol[], color: Color }> = ({ pieces, color }) => {
    // Count the occurrences of each piece type
    const counts = pieces.reduce((acc, piece) => {
      acc[piece] = (acc[piece] || 0) + 1;
      return acc;
    }, {} as Record<PieceSymbol, number>);

    const pieceOrder: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q']; // Order to display pieces
    const capturedPieceColor = color === 'w' ? 'w' : 'b'; // This is the color *of* the captured pieces

    const elements = pieceOrder.reduce((acc, pieceType) => {
      const count = counts[pieceType] || 0;
      if (count > 0) {
        let className = 'captured-pieces-cpiece';
        const numSuffix = count > 1 ? `${count}-` : ''; // e.g., "2-", "3-"
        const pluralSuffix = count > 1 ? 's' : ''; // e.g., "pawns", "knights"

        // Map PieceSymbol to string name for class
        const pieceNameMap: Record<PieceSymbol, string> = {
          p: 'pawn',
          n: 'knight',
          b: 'bishop',
          r: 'rook',
          q: 'queen',
          k: 'king' // King shouldn't be captured, but include for completeness
        };
        const pieceName = pieceNameMap[pieceType];

        // Handle specific cases where CSS class might not follow simple pattern (e.g., queen)
        if (pieceType === 'q' && count > 1) {
          // If sprite doesn't have 2+ queens, render multiple single queens
          for (let i = 0; i < count; i++) {
            acc.push(<span key={`${capturedPieceColor}-${pieceType}-${i}`} className={`captured-pieces-cpiece captured-pieces-${capturedPieceColor}-queen`} />);
          }
        } else if (count > 8 && pieceType === 'p') {
          // Handle more than 8 pawns if needed (render 8 + singles)
          acc.push(<span key={`${capturedPieceColor}-p-8`} className={`captured-pieces-cpiece captured-pieces-${capturedPieceColor}-8-pawns`} />);
          for (let i = 8; i < count; i++) {
            acc.push(<span key={`${capturedPieceColor}-p-${i}`} className={`captured-pieces-cpiece captured-pieces-${capturedPieceColor}-pawn`} />);
          }
        } else {
          // Default case: construct class like captured-pieces-w-3-pawns
          className += ` captured-pieces-${capturedPieceColor}-${numSuffix}${pieceName}${pluralSuffix}`;
          acc.push(<span key={`${capturedPieceColor}-${pieceType}-${count}`} className={className} />);
        }
      }
      return acc;
    }, [] as React.ReactElement[]);

    return (
      <div className={`flex flex-wrap items-end gap-x-1 p-1 min-h-[32px] sm:min-h-[40px] border border-[rgb(var(--card-border-rgb))] rounded bg-[rgba(var(--card-bg-rgb),0.7)] dark:bg-gray-800/60 shadow-inner ${color === 'w' ? 'justify-start' : 'justify-end'} flex-grow`}>
        {elements.length === 0 ? (
          <span className="text-[rgb(var(--secondary-rgb))] dark:text-gray-500 text-sm italic self-center">No captures</span>
        ) : (
          elements
        )}
      </div>
    );
  };

  // Timer display component (use props)
  const TimerDisplay: React.FC<{ time: number, isBlack: boolean }> = ({ time, isBlack }) => {
    const isLowTime = time < 30;
    const lowTimeClass = isLowTime ? 'animate-pulse' : '';

    return (
      <div className={`
        px-4 py-2 sm:px-5 sm:py-3
        rounded-lg shadow-lg
        text-xl sm:text-2xl
        font-mono font-semibold
        text-right 
        min-w-[90px] sm:min-w-[100px]
        border border-black/10 dark:border-white/10
        ${isBlack 
          ? 'bg-gradient-to-br from-gray-800 to-black text-white dark:from-gray-700 dark:to-black'
          : 'bg-gradient-to-br from-white to-gray-200 text-black dark:from-gray-200 dark:to-gray-400 dark:text-black'
        }
        ${lowTimeClass}
      `}>
        {formatTime(time)}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 md:gap-4 w-full px-2 sm:px-4">
      {/* Top row */}
      <div className="w-full flex justify-between items-stretch gap-2">
        {capturedPieces && <CapturedPiecesDisplay pieces={capturedPieces.w} color="w" />} { /* Check if prop exists */}
        {isTimerEnabled && <TimerDisplay time={blackTime} isBlack={true} />} { /* Check if prop exists */}
      </div>
      
      {/* Status Text */}
      <div className="h-6 sm:h-8 text-[rgb(var(--foreground-rgb))] text-lg sm:text-xl font-semibold text-center">
        {gameOverMessage ? ( // Use prop
           <span className="text-red-500 dark:text-red-400 font-bold">{gameOverMessage}</span>
           ) : (<span>{game.turn() === 'w' ? "White's Turn" : "Black's Turn"}</span>) // Use prop
        }
      </div>

      {/* Chessboard Grid */}
      <div className="grid grid-cols-8 w-[320px] h-[320px] sm:w-[448px] sm:h-[448px] md:w-[512px] md:h-[512px] border-2 sm:border-4 border-[rgb(var(--card-border-rgb))] dark:border-gray-600 shadow-lg">
        {squares}
      </div>

      {/* Bottom row */}
      <div className="w-full flex justify-between items-stretch gap-2">
        {isTimerEnabled && <TimerDisplay time={whiteTime} isBlack={false} />} { /* Check if prop exists */}
        {capturedPieces && <CapturedPiecesDisplay pieces={capturedPieces.b} color="b" />} { /* Check if prop exists */}
      </div>
    </div>
  );
};
// --- Component End --- 

export default Chessboard; 