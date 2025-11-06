import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Clear the telegramChatId
    await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Telegram:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Telegram' },
      { status: 500 }
    );
  }
}
