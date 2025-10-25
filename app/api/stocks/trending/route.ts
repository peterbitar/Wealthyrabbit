import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache for 5 minutes

// GET /api/stocks/trending - Get trending stocks with social sentiment
export async function GET(request: Request) {
  try {
    // Check cache first
    const cached = await prisma.trendingStock.findMany({
      orderBy: { redditMentions: 'desc' },
      take: 10,
    });

    const now = new Date();
    const cacheAge = cached.length > 0
      ? now.getTime() - cached[0].lastUpdated.getTime()
      : Infinity;

    // Return cached data if fresh
    if (cached.length > 0 && cacheAge < CACHE_DURATION_MS) {
      // Fetch current prices for cached stocks
      const symbols = cached.map(s => s.symbol);
      const prices = await prisma.stockPrice.findMany({
        where: { symbol: { in: symbols } }
      });
      const priceMap = new Map(prices.map(p => [p.symbol, p]));

      // Merge price data with cached social data
      const enrichedCached = cached.map(stock => {
        const price = priceMap.get(stock.symbol);
        return {
          ...stock,
          currentPrice: price?.currentPrice || 0,
          dayChange: price?.dayChange || 0,
          dayChangePercent: price?.dayChangePercent || 0,
        };
      });

      return NextResponse.json({
        stocks: enrichedCached,
        fromCache: true,
        cacheAge: Math.round(cacheAge / 1000),
      });
    }

    // Use a curated list of popular stocks for trending
    // In production, this could be replaced with social sentiment API
    const popularSymbols = [
      'AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL',
      'AMZN', 'META', 'AMD', 'NFLX', 'COIN'
    ];

    // Fetch current prices for these stocks
    const stockPrices = await prisma.stockPrice.findMany({
      where: {
        symbol: { in: popularSymbols }
      }
    });

    // For any missing prices, fetch from Finnhub
    const missingSymbols = popularSymbols.filter(
      symbol => !stockPrices.find(p => p.symbol === symbol)
    );

    for (const symbol of missingSymbols) {
      try {
        const quoteResponse = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
        );
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          const currentPrice = quoteData.c || 0;
          const previousClose = quoteData.pc || currentPrice;
          const dayChange = currentPrice - previousClose;
          const dayChangePercent = previousClose !== 0
            ? (dayChange / previousClose) * 100
            : 0;

          const priceData = {
            symbol,
            name: symbol,
            currentPrice,
            previousClose,
            dayChange,
            dayChangePercent,
            volume: null,
            marketCap: null,
            lastUpdated: now,
          };

          await prisma.stockPrice.upsert({
            where: { symbol },
            update: priceData,
            create: priceData,
          });

          stockPrices.push(priceData as any);
        }
      } catch (err) {
        console.error(`Failed to fetch ${symbol}:`, err);
      }
    }

    const topStocks = stockPrices.slice(0, 10);

    // Enrich with social sentiment (simulated for now)
    const enrichedStocks = await Promise.all(
      topStocks.map(async (stock: any) => {
        // Generate realistic social metrics
        const redditBenchmark = Math.floor(Math.random() * 500) + 100;
        const redditMentions = Math.floor(Math.random() * 1000) + 50;
        const sentiment = stock.dayChangePercent >= 0 ? 'positive' : 'negative';

        let vibe = '';
        let momentum = '';

        const absChange = Math.abs(stock.dayChangePercent);
        if (absChange > 5) {
          vibe = stock.dayChangePercent > 0 ? 'On fire 🔥' : 'Free falling';
          momentum = stock.dayChangePercent > 0 ? 'Strong' : 'Fading';
        } else if (absChange > 2) {
          vibe = stock.dayChangePercent > 0 ? 'Steady climb' : 'Sliding down';
          momentum = 'Building';
        } else {
          vibe = 'Chill vibes';
          momentum = 'Stable';
        }

        const friendsWatching = Math.floor(Math.random() * 50);

        return {
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          dayChange: stock.dayChange,
          dayChangePercent: stock.dayChangePercent,
          sentiment,
          vibe,
          redditMentions,
          redditBenchmark,
          momentum,
          friendsWatching,
          lastUpdated: now,
        };
      })
    );

    // Update cache - delete old entries and insert new ones
    await prisma.trendingStock.deleteMany({});
    const socialDataOnly = enrichedStocks.map(({ currentPrice, dayChange, dayChangePercent, ...rest }) => rest);
    await prisma.trendingStock.createMany({
      data: socialDataOnly,
    });

    return NextResponse.json({
      stocks: enrichedStocks,
      fromCache: false,
    });
  } catch (error) {
    console.error('Error fetching trending stocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending stocks' },
      { status: 500 }
    );
  }
}
