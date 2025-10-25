import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/portfolio/watchlist - Get all watchlist items for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'test-user-id';

    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });

    return NextResponse.json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio/watchlist - Add a stock to watchlist
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, symbol, name } = body;

    // Validation
    if (!userId || !symbol || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId,
        symbol: symbol.toUpperCase(),
        name,
      },
    });

    return NextResponse.json(watchlistItem, { status: 201 });
  } catch (error: any) {
    console.error('Error adding to watchlist:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Stock already in watchlist' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolio/watchlist?id=xxx - Remove from watchlist
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Watchlist item ID is required' },
        { status: 400 }
      );
    }

    await prisma.watchlist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to remove from watchlist' },
      { status: 500 }
    );
  }
}
