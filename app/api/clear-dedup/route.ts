import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Clear notification deduplication for testing
 * DELETE /api/clear-dedup?userId=xxx
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const result = await prisma.sentNotification.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.count} notification records`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Error clearing deduplication:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
