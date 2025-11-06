import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  try {
    console.log('Running database migration...');

    const prisma = new PrismaClient();

    // Create tables using raw SQL
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "telegramChatId" TEXT NOT NULL UNIQUE,
        "telegramUsername" TEXT,
        "firstName" TEXT,
        "lastName" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "NotificationSettings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "mode" TEXT NOT NULL DEFAULT 'balanced',
        "mutedUntil" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Holding" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "symbol" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "shares" DOUBLE PRECISION NOT NULL,
        "avgPrice" DOUBLE PRECISION NOT NULL,
        "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Watchlist" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "symbol" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StockPrice" (
        "symbol" TEXT NOT NULL PRIMARY KEY,
        "currentPrice" DOUBLE PRECISION NOT NULL,
        "dayChangePercent" DOUBLE PRECISION NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TrendingStock" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "symbol" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "currentPrice" DOUBLE PRECISION NOT NULL,
        "dayChangePercent" DOUBLE PRECISION NOT NULL,
        "volume" BIGINT NOT NULL,
        "sentiment" TEXT NOT NULL,
        "vibe" TEXT NOT NULL,
        "momentum" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SentNotification" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "symbol" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SentNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Holding_userId_idx" ON "Holding"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Watchlist_userId_idx" ON "Watchlist"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SentNotification_userId_symbol_idx" ON "SentNotification"("userId", "symbol");`);

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
