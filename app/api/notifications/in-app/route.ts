import { NextResponse } from 'next/server';
import { getAllNotifications, markAllAsRead } from '@/lib/in-app-notifications';

// GET /api/notifications/in-app - Get all in-app notifications
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const notifications = await getAllNotifications(userId);

    // Count unread notifications
    const unreadCount = notifications.filter(notif => !notif.read).length;

    // Format for the Ask page (as messages)
    const messages = notifications.map(notif => ({
      role: 'assistant' as const,
      content: notif.message,
      voiceNotes: notif.voiceNotes || [],
      time: new Date(notif.createdAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      createdAt: notif.createdAt.toISOString(), // Add full timestamp for sorting
      id: notif.id,
      read: notif.read,
    }));

    return NextResponse.json({
      success: true,
      notifications: messages,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error fetching in-app notifications:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// POST /api/notifications/in-app - Mark notifications as read
export async function POST(request: Request) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    await markAllAsRead(userId);

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
