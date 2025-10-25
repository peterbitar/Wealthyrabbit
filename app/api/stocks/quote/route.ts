import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const CACHE_DURATION_MS = 60 * 1000; // Cache for 1 minute

// GET /api/stocks/quote?symbol=AAPL
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();

    if (!symbol) {
      return NextResponse.json(
        { error: 'Stock symbol is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await prisma.stockPrice.findUnique({
      where: { symbol },
    });

    const now = new Date();
    const cacheAge = cached ? now.getTime() - cached.lastUpdated.getTime() : Infinity;

    // Return cached data if fresh
    if (cached && cacheAge < CACHE_DURATION_MS) {
      return NextResponse.json({
        ...cached,
        fromCache: true,
        cacheAge: Math.round(cacheAge / 1000),
      });
    }

    // Fetch fresh data from Finnhub
    const quoteResponse = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );

    if (!quoteResponse.ok) {
      throw new Error('Failed to fetch from Finnhub');
    }

    const quoteData = await quoteResponse.json();

    // Fetch company profile for name
    const profileResponse = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );

    let name = symbol;
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      name = profileData.name || symbol;
    }

    // Calculate changes
    const currentPrice = quoteData.c || 0;
    const previousClose = quoteData.pc || currentPrice;
    const dayChange = currentPrice - previousClose;
    const dayChangePercent = previousClose !== 0
      ? (dayChange / previousClose) * 100
      : 0;

    // Prepare stock price data
    const stockPriceData = {
      symbol,
      name,
      currentPrice,
      previousClose,
      dayChange,
      dayChangePercent,
      volume: quoteData.v ? `${(quoteData.v / 1000000).toFixed(1)}M` : null,
      marketCap: null, // Would need additional API call
      lastUpdated: now,
    };

    // Update or create cache
    const stockPrice = await prisma.stockPrice.upsert({
      where: { symbol },
      update: stockPriceData,
      create: stockPriceData,
    });

    return NextResponse.json({
      ...stockPrice,
      fromCache: false,
    });
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock quote' },
      { status: 500 }
    );
  }
}
