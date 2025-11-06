import { NextRequest, NextResponse } from 'next/server';
import { checkAndNotifyUser } from '@/lib/basic-notifications';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

/**
 * POST /api/briefing/events-now
 * Force-check for abnormal/interesting events and send them immediately
 * This is the "what's interesting right now" button
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Force-checking abnormal events for user: ${userId}`);

    // Verify user exists and has Telegram
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Send intro message to Telegram if connected
    if (user.telegramChatId) {
      await sendTelegramMessage(
        user.telegramChatId,
        '🐇 Checking your holdings...'
      );
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Run basic notification check
    const result = await checkAndNotifyUser(userId);

    console.log(`✅ Basic notification check completed for user ${userId}`);
    console.log(`   → Sent: ${result.sentCount}, Skipped: ${result.skippedCount}, Moving: ${result.movingStocks.join(', ')}`);

    // Send a summary message if nothing was sent
    if (result.sentCount === 0 && user.telegramChatId) {
      if (result.skippedCount > 0) {
        // Stocks moved but already notified
        await sendTelegramMessage(
          user.telegramChatId,
          `Already caught you up on ${result.movingStocks.join(', ')} earlier today. Markets are staying put otherwise 📊`
        );
      } else {
        // No significant moves
        await sendTelegramMessage(
          user.telegramChatId,
          'Markets are pretty calm right now. Nothing moving more than 3% in your portfolio 🌤️'
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Event check complete! Check your notifications.',
      result,
    });

  } catch (error) {
    console.error('❌ Error in events-now:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
