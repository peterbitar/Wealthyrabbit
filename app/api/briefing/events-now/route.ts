import { NextRequest, NextResponse } from 'next/server';
import { checkAbnormalEventsForUser } from '@/lib/abnormal-event-detector';
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

    if (!user.telegramChatId) {
      return NextResponse.json(
        { error: 'Telegram not linked. Please connect your Telegram account first.' },
        { status: 400 }
      );
    }

    // Send intro message
    await sendTelegramMessage(
      user.telegramChatId,
      '🔍 *Checking for interesting events...*\n\nLooking at price moves, news surges, and sentiment shifts across your holdings.'
    );

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run abnormal event detection with quiet message enabled
    // This ensures user gets feedback even if nothing interesting happened
    await checkAbnormalEventsForUser(userId, true);

    // Note: checkAbnormalEventsForUser handles sending messages
    // It will send events if found, or a "markets are quiet" message if not

    // Check if any events were actually sent by looking at logs
    // For now, always return success since the function handles messaging
    console.log(`✅ Abnormal event check completed for user ${userId}`);

    return NextResponse.json({
      ok: true,
      message: 'Event check complete! Check Telegram for any interesting moves.',
    });

  } catch (error) {
    console.error('❌ Error in events-now:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
