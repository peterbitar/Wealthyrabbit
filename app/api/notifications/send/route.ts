import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage, formatStockAlert, formatPortfolioUpdate, formatDailyDigest, type StockAlert, type PortfolioUpdate } from '@/lib/whatsapp';

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
    if (!settings || !settings.whatsapp) {
      return NextResponse.json(
        { error: 'WhatsApp notifications not enabled' },
        { status: 400 }
      );
    }

    if (!user.phone) {
      return NextResponse.json(
        { error: 'Phone number not set' },
        { status: 400 }
      );
    }

    // Format message based on type
    let message = '';
    switch (type) {
      case 'stock_alert':
        if (!settings.portfolioAlerts) {
          return NextResponse.json({ error: 'Portfolio alerts disabled' }, { status: 400 });
        }
        message = formatStockAlert(data as StockAlert);
        break;

      case 'portfolio_update':
        message = formatPortfolioUpdate(data as PortfolioUpdate);
        break;

      case 'daily_digest':
        message = formatDailyDigest(data);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    // Send WhatsApp message
    const result = await sendWhatsAppMessage(user.phone, message);

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
    // Get all users with WhatsApp enabled
    const users = await prisma.user.findMany({
      where: {
        phone: { not: null },
        notificationSettings: {
          whatsapp: true,
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
            phone: user.phone,
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
