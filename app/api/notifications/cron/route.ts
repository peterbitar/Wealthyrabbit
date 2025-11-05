import { NextRequest, NextResponse } from 'next/server';
import { runBasicNotificationCheck } from '@/lib/basic-notifications';

/**
 * GET /api/notifications/cron
 * Vercel Cron Job endpoint - runs every 5 minutes
 * Checks all users and sends grouped notifications for moving stocks
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is from Vercel Cron (optional security)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Cron job triggered - running notification check');

    // Run the notification check for all users
    await runBasicNotificationCheck();

    return NextResponse.json({
      ok: true,
      message: 'Notification check completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
