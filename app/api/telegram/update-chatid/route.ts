import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const userId = searchParams.get('userId') || 'cmh503gjd00008okpn9ic7cia';

    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId parameter is required. Usage: /api/telegram/update-chatid?chatId=YOUR_CHAT_ID' },
        { status: 400 }
      );
    }

    // Update the user's Telegram chat ID
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        telegramChatId: chatId,
      },
      create: {
        id: userId,
        email: 'test@wealthyrabbit.com',
        name: 'Test User',
        telegramChatId: chatId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Chat ID ${chatId} has been saved! Refresh the manage page to see it.`,
      userId: userId,
    });
  } catch (error) {
    console.error('Error updating chat ID:', error);
    return NextResponse.json(
      { error: 'Failed to update chat ID' },
      { status: 500 }
    );
  }
}
