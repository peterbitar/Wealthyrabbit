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

    // Return cached data if fresh and has stocks
    // Cache only contains stocks that passed the "unusual activity" filter
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

    // Fetch stocks that are actually moving (unusual activity)
    // Start with a broader set of actively traded stocks to scan
    const stocksToScan = [
      'AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD', 'NFLX', 'COIN',
      'SPY', 'QQQ', 'BABA', 'TSM', 'V', 'JPM', 'INTC', 'PYPL', 'ADBE', 'CRM',
      'DIS', 'BA', 'GE', 'F', 'GM', 'UBER', 'LYFT', 'SQ', 'SHOP', 'SNAP',
      'PLTR', 'RBLX', 'DKNG', 'Z', 'ABNB', 'MRNA', 'PFE', 'JNJ', 'WMT', 'TGT',
      'HD', 'LOW', 'NKE', 'SBUX', 'MCD', 'KO', 'PEP', 'XOM', 'CVX', 'OXY'
    ];

    const interestingStocks: any[] = [];

    // Scan each stock for unusual activity
    for (const symbol of stocksToScan) {
      try {
        // Fetch current quote
        const quoteResponse = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
        );

        if (!quoteResponse.ok) continue;

        const quoteData = await quoteResponse.json();
        const currentPrice = quoteData.c || 0;
        const previousClose = quoteData.pc || currentPrice;

        if (currentPrice === 0 || previousClose === 0) continue;

        const dayChange = currentPrice - previousClose;
        const dayChangePercent = (dayChange / previousClose) * 100;

        // Only include stocks with significant moves (>3% either direction)
        const absChange = Math.abs(dayChangePercent);
        if (absChange < 3) continue;

        // Check for news to determine if this is newsworthy
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const fromDate = yesterday.toISOString().split('T')[0];
        const toDate = today.toISOString().split('T')[0];

        const newsResponse = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_API_KEY}`
        );

        let newsCount = 0;
        if (newsResponse.ok) {
          const newsItems = await newsResponse.json();
          newsCount = Array.isArray(newsItems) ? newsItems.length : 0;
        }

        // Calculate "interestingness" score
        // Higher score = more interesting (bigger move + more news)
        const interestScore = absChange + (newsCount * 0.5);

        // Determine sentiment, vibe, and momentum based on actual movement
        const sentiment = dayChangePercent >= 0 ? 'positive' : 'negative';
        let vibe = '';
        let momentum = '';

        if (absChange > 5) {
          vibe = dayChangePercent > 0 ? 'On fire 🔥' : 'Free falling';
          momentum = dayChangePercent > 0 ? 'Strong' : 'Fading';
        } else if (absChange >= 3) {
          vibe = dayChangePercent > 0 ? 'Steady climb' : 'Sliding down';
          momentum = 'Building';
        }

        // Store or update price data
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

        interestingStocks.push({
          symbol,
          name: symbol,
          currentPrice,
          dayChange,
          dayChangePercent,
          sentiment,
          vibe,
          redditMentions: newsCount * 10, // Use news count as proxy for buzz
          redditBenchmark: 100, // Static baseline
          momentum,
          friendsWatching: 0, // Not used in MVP
          lastUpdated: now,
          interestScore,
        });

      } catch (err) {
        console.error(`Failed to scan ${symbol}:`, err);
      }
    }

    // Sort by interestingness score and take top 10
    const enrichedStocks = interestingStocks
      .sort((a, b) => b.interestScore - a.interestScore)
      .slice(0, 10)
      .map(({ interestScore, ...stock }) => stock); // Remove internal score field

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
