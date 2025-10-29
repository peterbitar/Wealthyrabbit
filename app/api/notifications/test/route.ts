import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

// POST /api/notifications/test - Send a test Telegram message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user and their telegram chat ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        notificationSettings: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.telegramChatId) {
      return NextResponse.json(
        { error: 'Telegram Chat ID not set. Please add your Chat ID in Manage settings.' },
        { status: 400 }
      );
    }

    // Check if Telegram is enabled
    if (!user.notificationSettings?.telegram) {
      return NextResponse.json(
        { error: 'Telegram notifications not enabled. Please enable Telegram in Manage settings.' },
        { status: 400 }
      );
    }

    // Send test message
    const testMessage = `🐇 *WealthyRabbit Test*

Hello! This is a test notification from WealthyRabbit.

Your Telegram notifications are working! 🎉

You'll receive updates about:
• Stock price movements
• Portfolio performance
• Daily market digest

Notification Mode: ${user.notificationSettings.mode}

🐇 Happy investing!`;

    const result = await sendTelegramMessage(user.telegramChatId, testMessage);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to send test message',
          details: 'Make sure you have set up TELEGRAM_BOT_TOKEN in .env file and have the correct Chat ID.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully!',
      chatId: user.telegramChatId,
    });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      {
        error: 'Failed to send test notification',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
