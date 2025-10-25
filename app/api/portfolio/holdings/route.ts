import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/portfolio/holdings - Get all holdings for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'test-user-id';

    const holdings = await prisma.holding.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(holdings);
  } catch (error) {
    console.error('Error fetching holdings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio/holdings - Add a new holding
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, symbol, name, shares, avgPrice, purchaseDate } = body;

    // Validation
    if (!userId || !symbol || !name || !shares || !avgPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const holding = await prisma.holding.create({
      data: {
        userId,
        symbol: symbol.toUpperCase(),
        name,
        shares: parseFloat(shares),
        avgPrice: parseFloat(avgPrice),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      },
    });

    return NextResponse.json(holding, { status: 201 });
  } catch (error: any) {
    console.error('Error creating holding:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'You already own this stock' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create holding' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolio/holdings?id=xxx - Delete a holding
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Holding ID is required' },
        { status: 400 }
      );
    }

    await prisma.holding.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting holding:', error);
    return NextResponse.json(
      { error: 'Failed to delete holding' },
      { status: 500 }
    );
  }
}
