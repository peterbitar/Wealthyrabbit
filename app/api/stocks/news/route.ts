import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/stocks/news
 * Get news articles for a specific stock
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Calculate date range (last 7 days)
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);

    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    // Fetch company news from Finnhub
    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromStr}&to=${toStr}&token=${apiKey}`
    );

    const data = await response.json();

    if (!Array.isArray(data)) {
      return NextResponse.json({
        news: [],
        message: 'No news available'
      });
    }

    // Transform and filter news
    const news = data
      .filter((item: any) => item.headline && item.summary)
      .slice(0, 20) // Limit to 20 most recent
      .map((item: any) => {
        const timestamp = item.datetime * 1000;
        const date = new Date(timestamp);
        const now = Date.now();
        const diff = now - timestamp;

        // Format relative time
        let relatedTime: string;
        if (diff < 3600000) {
          relatedTime = `${Math.floor(diff / 60000)}m ago`;
        } else if (diff < 86400000) {
          relatedTime = `${Math.floor(diff / 3600000)}h ago`;
        } else {
          relatedTime = `${Math.floor(diff / 86400000)}d ago`;
        }

        return {
          headline: item.headline,
          summary: item.summary,
          source: item.source || 'Unknown',
          url: item.url,
          timestamp,
          relatedTime,
        };
      });

    return NextResponse.json({
      news,
      symbol,
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
