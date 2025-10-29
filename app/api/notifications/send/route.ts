import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

// POST /api/notifications/send - Send notifications to users
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, type, data } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user and notification settings
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

    const settings = user.notificationSettings;
    if (!settings || !settings.telegram) {
      return NextResponse.json(
        { error: 'Telegram notifications not enabled' },
        { status: 400 }
      );
    }

    if (!user.telegramChatId) {
      return NextResponse.json(
        { error: 'Telegram chat ID not set' },
        { status: 400 }
      );
    }

    // Get message from request
    const { message } = data;
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Send Telegram message
    const result = await sendTelegramMessage(user.telegramChatId, message);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

// GET /api/notifications/send - Check for users who need notifications
export async function GET() {
  try {
    // Get all users with Telegram enabled
    const users = await prisma.user.findMany({
      where: {
        telegramChatId: { not: null },
        notificationSettings: {
          telegram: true,
          portfolioAlerts: true,
        },
      },
      include: {
        notificationSettings: true,
        holdings: true,
      },
    });

    // Fetch current prices for all holdings
    const allSymbols = Array.from(
      new Set(users.flatMap(u => u.holdings.map(h => h.symbol)))
    );

    const prices = await prisma.stockPrice.findMany({
      where: { symbol: { in: allSymbols } },
    });

    const priceMap = new Map(prices.map(p => [p.symbol, p]));

    const notifications = [];

    // Check each user's portfolio for significant price changes
    for (const user of users) {
      const mode = user.notificationSettings?.mode || 'balanced';
      const threshold = mode === 'calm' ? 5 : mode === 'balanced' ? 2 : 1;

      for (const holding of user.holdings) {
        const price = priceMap.get(holding.symbol);
        if (!price) continue;

        const changePercent = Math.abs(price.dayChangePercent);
        if (changePercent >= threshold) {
          notifications.push({
            userId: user.id,
            chatId: user.telegramChatId,
            type: 'stock_alert',
            data: {
              symbol: holding.symbol,
              name: holding.name,
              currentPrice: price.currentPrice,
              changePercent: price.dayChangePercent,
              alert: `Significant price movement detected!`,
            },
          });
        }
      }
    }

    return NextResponse.json({
      usersChecked: users.length,
      notificationsReady: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error('Error checking for notifications:', error);
    return NextResponse.json(
      { error: 'Failed to check for notifications' },
      { status: 500 }
    );
  }
}
