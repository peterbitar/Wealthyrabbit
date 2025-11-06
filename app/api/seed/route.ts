import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  try {
    const prisma = new PrismaClient();

    // Create a test user with a fixed ID to match the frontend
    const testUserId = 'cmh503gjd00008okpn9ic7cia';

    const user = await prisma.user.upsert({
      where: { email: 'test@wealthyrabbit.com' },
      update: { id: testUserId },
      create: {
        id: testUserId,
        email: 'test@wealthyrabbit.com',
        name: 'Test User',
        telegramChatId: '123456789',
      },
    });

    console.log('Created user:', user.id);

    // Add some holdings (stocks the user owns)
    const holdings = await Promise.all([
      prisma.holding.upsert({
        where: { userId_symbol: { userId: user.id, symbol: 'AAPL' } },
        update: {},
        create: {
          userId: user.id,
          symbol: 'AAPL',
          name: 'Apple Inc.',
          shares: 10,
          avgPrice: 150.00,
        },
      }),
      prisma.holding.upsert({
        where: { userId_symbol: { userId: user.id, symbol: 'GOOGL' } },
        update: {},
        create: {
          userId: user.id,
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          shares: 5,
          avgPrice: 2800.00,
        },
      }),
      prisma.holding.upsert({
        where: { userId_symbol: { userId: user.id, symbol: 'TSLA' } },
        update: {},
        create: {
          userId: user.id,
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          shares: 8,
          avgPrice: 700.00,
        },
      }),
      prisma.holding.upsert({
        where: { userId_symbol: { userId: user.id, symbol: 'MSFT' } },
        update: {},
        create: {
          userId: user.id,
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          shares: 12,
          avgPrice: 380.00,
        },
      }),
    ]);

    console.log(`Created ${holdings.length} holdings`);

    // Add some watchlist stocks
    const watchlist = await Promise.all([
      prisma.watchlist.upsert({
        where: { userId_symbol: { userId: user.id, symbol: 'NVDA' } },
        update: {},
        create: {
          userId: user.id,
          symbol: 'NVDA',
          name: 'NVIDIA Corporation',
        },
      }),
      prisma.watchlist.upsert({
        where: { userId_symbol: { userId: user.id, symbol: 'AMD' } },
        update: {},
        create: {
          userId: user.id,
          symbol: 'AMD',
          name: 'Advanced Micro Devices',
        },
      }),
      prisma.watchlist.upsert({
        where: { userId_symbol: { userId: user.id, symbol: 'META' } },
        update: {},
        create: {
          userId: user.id,
          symbol: 'META',
          name: 'Meta Platforms Inc.',
        },
      }),
    ]);

    console.log(`Created ${watchlist.length} watchlist items`);

    // Add some stock prices (cache)
    const stockPrices = await Promise.all([
      prisma.stockPrice.upsert({
        where: { symbol: 'AAPL' },
        update: {
          currentPrice: 178.50,
          previousClose: 175.20,
          dayChange: 3.30,
          dayChangePercent: 1.88,
          volume: '52.3M',
          marketCap: '2.8T',
        },
        create: {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          currentPrice: 178.50,
          previousClose: 175.20,
          dayChange: 3.30,
          dayChangePercent: 1.88,
          volume: '52.3M',
          marketCap: '2.8T',
        },
      }),
      prisma.stockPrice.upsert({
        where: { symbol: 'GOOGL' },
        update: {
          currentPrice: 142.80,
          previousClose: 140.50,
          dayChange: 2.30,
          dayChangePercent: 1.64,
          volume: '28.1M',
          marketCap: '1.8T',
        },
        create: {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          currentPrice: 142.80,
          previousClose: 140.50,
          dayChange: 2.30,
          dayChangePercent: 1.64,
          volume: '28.1M',
          marketCap: '1.8T',
        },
      }),
      prisma.stockPrice.upsert({
        where: { symbol: 'TSLA' },
        update: {
          currentPrice: 248.50,
          previousClose: 255.30,
          dayChange: -6.80,
          dayChangePercent: -2.66,
          volume: '95.2M',
          marketCap: '789B',
        },
        create: {
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          currentPrice: 248.50,
          previousClose: 255.30,
          dayChange: -6.80,
          dayChangePercent: -2.66,
          volume: '95.2M',
          marketCap: '789B',
        },
      }),
      prisma.stockPrice.upsert({
        where: { symbol: 'MSFT' },
        update: {
          currentPrice: 425.20,
          previousClose: 422.10,
          dayChange: 3.10,
          dayChangePercent: 0.73,
          volume: '21.5M',
          marketCap: '3.2T',
        },
        create: {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          currentPrice: 425.20,
          previousClose: 422.10,
          dayChange: 3.10,
          dayChangePercent: 0.73,
          volume: '21.5M',
          marketCap: '3.2T',
        },
      }),
      prisma.stockPrice.upsert({
        where: { symbol: 'NVDA' },
        update: {
          currentPrice: 495.30,
          previousClose: 488.20,
          dayChange: 7.10,
          dayChangePercent: 1.45,
          volume: '42.8M',
          marketCap: '1.2T',
        },
        create: {
          symbol: 'NVDA',
          name: 'NVIDIA Corporation',
          currentPrice: 495.30,
          previousClose: 488.20,
          dayChange: 7.10,
          dayChangePercent: 1.45,
          volume: '42.8M',
          marketCap: '1.2T',
        },
      }),
      prisma.stockPrice.upsert({
        where: { symbol: 'AMD' },
        update: {
          currentPrice: 162.40,
          previousClose: 158.90,
          dayChange: 3.50,
          dayChangePercent: 2.20,
          volume: '38.2M',
          marketCap: '262B',
        },
        create: {
          symbol: 'AMD',
          name: 'Advanced Micro Devices',
          currentPrice: 162.40,
          previousClose: 158.90,
          dayChange: 3.50,
          dayChangePercent: 2.20,
          volume: '38.2M',
          marketCap: '262B',
        },
      }),
      prisma.stockPrice.upsert({
        where: { symbol: 'META' },
        update: {
          currentPrice: 485.60,
          previousClose: 478.30,
          dayChange: 7.30,
          dayChangePercent: 1.53,
          volume: '15.7M',
          marketCap: '1.2T',
        },
        create: {
          symbol: 'META',
          name: 'Meta Platforms Inc.',
          currentPrice: 485.60,
          previousClose: 478.30,
          dayChange: 7.30,
          dayChangePercent: 1.53,
          volume: '15.7M',
          marketCap: '1.2T',
        },
      }),
    ]);

    console.log(`Created/updated ${stockPrices.length} stock prices`);

    // Add some trending stocks
    const trendingStocks = await Promise.all([
      prisma.trendingStock.upsert({
        where: { symbol: 'NVDA' },
        update: {
          name: 'NVIDIA Corporation',
          sentiment: 'positive',
          vibe: 'On fire',
          redditMentions: 1250,
          redditBenchmark: 500,
          momentum: 'Strong',
          friendsWatching: 8,
        },
        create: {
          symbol: 'NVDA',
          name: 'NVIDIA Corporation',
          sentiment: 'positive',
          vibe: 'On fire',
          redditMentions: 1250,
          redditBenchmark: 500,
          momentum: 'Strong',
          friendsWatching: 8,
        },
      }),
      prisma.trendingStock.upsert({
        where: { symbol: 'AMD' },
        update: {
          name: 'Advanced Micro Devices',
          sentiment: 'positive',
          vibe: 'Steady climb',
          redditMentions: 850,
          redditBenchmark: 400,
          momentum: 'Building',
          friendsWatching: 5,
        },
        create: {
          symbol: 'AMD',
          name: 'Advanced Micro Devices',
          sentiment: 'positive',
          vibe: 'Steady climb',
          redditMentions: 850,
          redditBenchmark: 400,
          momentum: 'Building',
          friendsWatching: 5,
        },
      }),
      prisma.trendingStock.upsert({
        where: { symbol: 'TSLA' },
        update: {
          name: 'Tesla Inc.',
          sentiment: 'neutral',
          vibe: 'Mixed signals',
          redditMentions: 2100,
          redditBenchmark: 1800,
          momentum: 'Fading',
          friendsWatching: 12,
        },
        create: {
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          sentiment: 'neutral',
          vibe: 'Mixed signals',
          redditMentions: 2100,
          redditBenchmark: 1800,
          momentum: 'Fading',
          friendsWatching: 12,
        },
      }),
    ]);

    console.log(`Created/updated ${trendingStocks.length} trending stocks`);

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        userId: user.id,
        holdings: holdings.length,
        watchlist: watchlist.length,
        stockPrices: stockPrices.length,
        trendingStocks: trendingStocks.length,
      },
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString(),
    }, { status: 500 });
  }
}
