import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/notifications/settings - Get notification settings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get or create notification settings
    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.notificationSettings.create({
        data: { userId },
      });
    }

    // Get user telegram chat ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    return NextResponse.json({
      settings,
      telegramChatId: user?.telegramChatId || '',
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/settings - Update notification settings
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      mode,
      channels,
      topics,
      telegramChatId,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update or create notification settings
    const settings = await prisma.notificationSettings.upsert({
      where: { userId },
      update: {
        mode,
        inApp: channels.inApp,
        telegram: channels.telegram,
        email: channels.email,
        news: topics.news,
        reddit: topics.reddit,
        expertOpinions: topics.expertOpinions,
        friendActivity: topics.friendActivity,
        portfolioAlerts: topics.portfolioAlerts,
      },
      create: {
        userId,
        mode,
        inApp: channels.inApp,
        telegram: channels.telegram,
        email: channels.email,
        news: topics.news,
        reddit: topics.reddit,
        expertOpinions: topics.expertOpinions,
        friendActivity: topics.friendActivity,
        portfolioAlerts: topics.portfolioAlerts,
      },
    });

    // Update user telegram chat ID if provided
    if (telegramChatId !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { telegramChatId },
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}
