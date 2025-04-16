import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  // Await the auth() call to get the userId
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // Extract moves and isGameOver from the request body
    const { fen, moves, whiteTime, blackTime, isTimerEnabled, isGameOver } = body;

    // Basic validation
    if (!fen) {
      return NextResponse.json({ error: 'FEN string is required' }, { status: 400 });
    }
    // Add validation for moves if necessary (e.g., check if it's an array)
    if (moves && !Array.isArray(moves)) {
      return NextResponse.json({ error: 'Moves must be an array of strings' }, { status: 400 });
    }

    // --- Calculate Default Game Name --- 
    // Count existing games for the user to determine the next game number
    const existingGamesCount = await prisma.savedGame.count({
      where: {
        userId: userId,
      },
    });
    const nextGameNumber = existingGamesCount + 1;
    const defaultGameName = `Game ${nextGameNumber}`;
    // --- End Calculate Default Game Name ---

    const savedGame = await prisma.savedGame.create({
      data: {
        userId: userId,
        fen: fen,
        moves: moves ?? [], // Save moves, default to empty array if not provided
        whiteTime: whiteTime,
        blackTime: blackTime,
        isTimerEnabled: isTimerEnabled ?? false, // Default to false if not provided
        isGameOver: isGameOver ?? false, // Save game over status, default to false
        name: defaultGameName, // Set the calculated default name
      },
    });

    return NextResponse.json({ message: 'Game saved successfully', gameId: savedGame.id }, { status: 201 });

  } catch (error) {
    console.error('Error saving game:', error);

    // Determine the error message
    let errorMessage = 'Failed to save game';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Return a proper JSON error response
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client
  }
} 