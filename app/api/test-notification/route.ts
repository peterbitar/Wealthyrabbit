import { NextResponse } from 'next/server';
import { sendInAppNotification } from '@/lib/in-app-notifications';

/**
 * Test endpoint to manually send a notification
 * Usage: GET /api/test-notification?userId=xxx
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const testMessage = `Hey! 👋 This is a test notification sent at ${new Date().toLocaleTimeString()}. The in-app notification system is working!`;

    const result = await sendInAppNotification(userId, testMessage);

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Test notification sent!' : 'Failed to send notification',
      error: result.error,
    });
  } catch (error: any) {
    console.error('Error in test-notification:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
