import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  try {
    console.log('Running database migration...');

    const prisma = new PrismaClient();

    // Drop existing tables with wrong names (if they exist)
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "SentNotification" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "TrendingStock" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "StockPrice" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Watchlist" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Holding" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "NotificationSettings" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "User" CASCADE;`);

    // Create tables with correct lowercase names matching @@map() directives
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT,
        "phone" TEXT,
        "telegramChatId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notification_settings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "mode" TEXT NOT NULL DEFAULT 'balanced',
        "inApp" BOOLEAN NOT NULL DEFAULT true,
        "telegram" BOOLEAN NOT NULL DEFAULT false,
        "email" BOOLEAN NOT NULL DEFAULT true,
        "news" BOOLEAN NOT NULL DEFAULT true,
        "reddit" BOOLEAN NOT NULL DEFAULT true,
        "expertOpinions" BOOLEAN NOT NULL DEFAULT false,
        "friendActivity" BOOLEAN NOT NULL DEFAULT true,
        "portfolioAlerts" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "holdings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "symbol" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "shares" DOUBLE PRECISION NOT NULL,
        "avgPrice" DOUBLE PRECISION NOT NULL,
        "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "holdings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE ("userId", "symbol")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "watchlist" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "symbol" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE ("userId", "symbol")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "stock_prices" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "symbol" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "currentPrice" DOUBLE PRECISION NOT NULL,
        "previousClose" DOUBLE PRECISION NOT NULL,
        "dayChange" DOUBLE PRECISION NOT NULL,
        "dayChangePercent" DOUBLE PRECISION NOT NULL,
        "volume" TEXT,
        "marketCap" TEXT,
        "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "trending_stocks" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "symbol" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "sentiment" TEXT NOT NULL,
        "vibe" TEXT NOT NULL,
        "redditMentions" INTEGER NOT NULL,
        "redditBenchmark" INTEGER NOT NULL,
        "momentum" TEXT NOT NULL,
        "friendsWatching" INTEGER NOT NULL,
        "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sent_notifications" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "symbol" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL
      );
    `);

    // Create in_app_notifications table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "in_app_notifications" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "in_app_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "holdings_userId_idx" ON "holdings"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "watchlist_userId_idx" ON "watchlist"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "sent_notifications_userId_symbol_eventType_idx" ON "sent_notifications"("userId", "symbol", "eventType");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "sent_notifications_expiresAt_idx" ON "sent_notifications"("expiresAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "in_app_notifications_userId_read_idx" ON "in_app_notifications"("userId", "read");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "in_app_notifications_userId_createdAt_idx" ON "in_app_notifications"("userId", "createdAt");`);

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully!',
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
