import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const { userId } = await auth(); // Await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // TODO: Add pagination later if needed
    const savedGames = await prisma.savedGame.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        updatedAt: 'desc', // Show most recently saved games first
      },
      // Select only needed fields to reduce payload
      select: {
        id: true,
        name: true,
        fen: true,
        moves: true,
        isGameOver: true,
        whiteTime: true,
        blackTime: true,
        isTimerEnabled: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(savedGames, { status: 200 });

  } catch (error) {
    //console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 