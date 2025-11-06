/**
 * In-App Notification System
 * Stores notifications in database for users to read in the app
 */

import { prisma } from './prisma';

export interface InAppNotification {
  id: string;
  userId: string;
  message: string;
  voiceNotes: string[];
  read: boolean;
  createdAt: Date;
}

/**
 * Send an in-app notification to a user
 */
export async function sendInAppNotification(
  userId: string,
  message: string,
  voiceNotes: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.inAppNotification.create({
      data: {
        userId,
        message,
        voiceNotes,
        read: false,
      },
    });

    console.log(`📱 In-app notification sent to user ${userId}${voiceNotes.length > 0 ? ` with ${voiceNotes.length} voice note(s)` : ''}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending in-app notification:', error);
    return {
      success: false,
      error: error.message || 'Failed to send in-app notification',
    };
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(
  userId: string
): Promise<InAppNotification[]> {
  try {
    const notifications = await prisma.inAppNotification.findMany({
      where: {
        userId,
        read: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 unread
    });

    return notifications;
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
}

/**
 * Get all notifications for a user (for chat history)
 */
export async function getAllNotifications(
  userId: string,
  limit: number = 100
): Promise<InAppNotification[]> {
  try {
    const notifications = await prisma.inAppNotification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return notifications;
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    return [];
  }
}

/**
 * Mark notification(s) as read
 */
export async function markAsRead(
  notificationIds: string[]
): Promise<{ success: boolean }> {
  try {
    await prisma.inAppNotification.updateMany({
      where: {
        id: {
          in: notificationIds,
        },
      },
      data: {
        read: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return { success: false };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<{ success: boolean }> {
  try {
    await prisma.inAppNotification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false };
  }
}
