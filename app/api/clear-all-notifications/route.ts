import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // Delete ALL notifications for this user
    const result = await prisma.inAppNotification.deleteMany({
      where: {
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} notifications`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Error clearing notifications:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
