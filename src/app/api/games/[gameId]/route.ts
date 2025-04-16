import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH handler for renaming a specific game
export async function PATCH(request: Request, { params }: { params: { gameId: string } }) {
  const { userId } = await auth();
  const awaitedParamsPatch = await params;
  const gameId = awaitedParamsPatch.gameId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!gameId) {
    return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    // Allow updating name or the full game state
    const { name, fen, moves, whiteTime, blackTime, isTimerEnabled, isGameOver } = body;

    const dataToUpdate: any = {}; // Use 'any' or create a specific update type

    // Conditionally add fields to the update object
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Valid game name is required' }, { status: 400 });
      }
      const trimmedName = name.trim();
      if (trimmedName.length > 16) {
        return NextResponse.json({ error: 'Game name cannot exceed 16 characters' }, { status: 400 });
      }
      dataToUpdate.name = trimmedName;
    }

    if (fen !== undefined) dataToUpdate.fen = fen;
    if (moves !== undefined) dataToUpdate.moves = moves; // Assuming validation happened on client/save
    if (whiteTime !== undefined) dataToUpdate.whiteTime = whiteTime;
    if (blackTime !== undefined) dataToUpdate.blackTime = blackTime;
    if (isTimerEnabled !== undefined) dataToUpdate.isTimerEnabled = isTimerEnabled;
    if (isGameOver !== undefined) dataToUpdate.isGameOver = isGameOver;

    // Ensure there's actually something to update
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    const updatedGame = await prisma.savedGame.updateMany({
      where: {
        id: gameId,
        userId: userId, // Ensure the user owns this game
      },
      data: dataToUpdate, // Use the dynamically built data object
    });

    // Check if any record was actually updated
    if (updatedGame.count === 0) {
      // This could mean the game doesn't exist or the user doesn't own it
      return NextResponse.json({ error: 'Game not found or not authorized to update' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Game updated successfully' }, { status: 200 });

  } catch (error) {
    console.error(`Error updating game ${gameId}:`, error);
    let errorMessage = 'Failed to update game';
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE handler for deleting a specific game
export async function DELETE(request: Request, { params }: { params: { gameId: string } }) {
  const { userId } = await auth();
  const awaitedParamsDelete = await params;
  const gameId = awaitedParamsDelete.gameId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!gameId) {
    return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
  }

  try {
    const deletedGame = await prisma.savedGame.deleteMany({
      where: {
        id: gameId,
        userId: userId, // Ensure the user owns this game
      },
    });

    // Check if any record was actually deleted
    if (deletedGame.count === 0) {
       // This could mean the game doesn't exist or the user doesn't own it
      return NextResponse.json({ error: 'Game not found or not authorized to delete' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Game deleted successfully' }, { status: 200 }); // Use 200 OK or 204 No Content

  } catch (error) {
    console.error(`Error deleting game ${gameId}:`, error);
    let errorMessage = 'Failed to delete game';
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// GET handler for fetching a specific game by ID
export async function GET(request: Request, { params }: { params: { gameId: string } }) {
  const { userId } = await auth();
  const awaitedParamsGet = await params;
  const gameId = awaitedParamsGet.gameId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!gameId) {
    return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
  }

  try {
    const game = await prisma.savedGame.findUnique({
      where: {
        id: gameId,
        userId: userId, // Ensure the user owns this game
      },
      // Select all necessary fields for replay
      select: {
        id: true,
        name: true,
        fen: true, 
        moves: true,
        isGameOver: true,
        // Include time if you want to display it in replay, otherwise omit
        whiteTime: true, 
        blackTime: true,
        isTimerEnabled: true,
        updatedAt: true,
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json(game, { status: 200 });

  } catch (error) {
    console.error(`Error fetching game ${gameId}:`, error);
    let errorMessage = 'Failed to fetch game';
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// --- Add DELETE handler later --- 