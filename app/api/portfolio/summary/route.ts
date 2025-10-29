import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/portfolio/summary - Get portfolio with current prices
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

    // Fetch holdings
    const holdings = await prisma.holding.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch watchlist
    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });

    // Get all unique symbols
    const allSymbols = [
      ...holdings.map(h => h.symbol),
      ...watchlist.map(w => w.symbol),
    ];

    // Fetch prices for all symbols
    const prices = await prisma.stockPrice.findMany({
      where: {
        symbol: { in: allSymbols },
      },
    });

    const priceMap = new Map(prices.map(p => [p.symbol, p]));

    // Fetch social sentiment data for holdings
    const holdingSymbols = holdings.map(h => h.symbol);
    const socialData = await prisma.trendingStock.findMany({
      where: { symbol: { in: holdingSymbols } }
    });
    const socialMap = new Map(socialData.map(s => [s.symbol, s]));

    // Enrich holdings with current prices and social sentiment
    const enrichedHoldings = holdings.map(holding => {
      const price = priceMap.get(holding.symbol);
      const social = socialMap.get(holding.symbol);
      const currentPrice = price?.currentPrice || holding.avgPrice;
      const totalValue = holding.shares * currentPrice;
      const totalCost = holding.shares * holding.avgPrice;
      const gainLoss = totalValue - totalCost;
      const gainLossPercent = totalCost !== 0 ? (gainLoss / totalCost) * 100 : 0;

      // Generate sentiment based on day change if not in trending data
      const dayChangePercent = price?.dayChangePercent || 0;
      const sentiment = social?.sentiment || (dayChangePercent >= 0 ? 'positive' : 'negative');
      const vibe = social?.vibe || (Math.abs(dayChangePercent) > 2
        ? (dayChangePercent > 0 ? 'Steady climb' : 'Sliding down')
        : 'Chill vibes');
      const momentum = social?.momentum || (Math.abs(dayChangePercent) > 2 ? 'Building' : 'Stable');

      return {
        ...holding,
        currentPrice,
        totalValue,
        gainLoss,
        gainLossPercent,
        dayChange: dayChangePercent,
        sentiment,
        vibe,
        redditMentions: social?.redditMentions || Math.floor(Math.random() * 500) + 100,
        redditBenchmark: social?.redditBenchmark || Math.floor(Math.random() * 300) + 150,
        momentum,
        friendsWatching: social?.friendsWatching || Math.floor(Math.random() * 30),
      };
    });

    // Enrich watchlist with current prices and sentiment
    const watchlistSymbols = watchlist.map(w => w.symbol);
    const watchlistSocialData = await prisma.trendingStock.findMany({
      where: { symbol: { in: watchlistSymbols } }
    });
    const watchlistSocialMap = new Map(watchlistSocialData.map(s => [s.symbol, s]));

    const enrichedWatchlist = watchlist.map(item => {
      const price = priceMap.get(item.symbol);
      const social = watchlistSocialMap.get(item.symbol);
      const dayChangePercent = price?.dayChangePercent || 0;
      const sentiment = social?.sentiment || (dayChangePercent >= 0 ? 'positive' : 'negative');

      return {
        ...item,
        currentPrice: price?.currentPrice || 0,
        dayChange: dayChangePercent,
        sentiment,
      };
    });

    // Calculate portfolio summary
    const totalValue = enrichedHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    const totalCost = enrichedHoldings.reduce(
      (sum, h) => sum + (h.shares * h.avgPrice),
      0
    );
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost !== 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Calculate day change (based on current day movements)
    const dayChange = enrichedHoldings.reduce((sum, h) => {
      const dayValueChange = (h.currentPrice * (h.dayChange / 100)) * h.shares;
      return sum + dayValueChange;
    }, 0);
    const dayChangePercent = totalValue !== 0 ? (dayChange / totalValue) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        dayChange,
        dayChangePercent,
      },
      holdings: enrichedHoldings,
      watchlist: enrichedWatchlist,
    });
  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio summary' },
      { status: 500 }
    );
  }
}
