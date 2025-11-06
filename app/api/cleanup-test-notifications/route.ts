import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // Delete test notifications (containing "test" or "This is a test")
    const result = await prisma.inAppNotification.deleteMany({
      where: {
        userId,
        OR: [
          { message: { contains: 'This is a test notification' } },
          { message: { contains: 'test notification sent at' } },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} test notifications`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Error cleaning up test notifications:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
