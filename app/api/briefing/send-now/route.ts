import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

interface StockContext {
  symbol: string;
  price: number;
  changePercent: number;
  news: Array<{ headline: string; summary: string }>;
  reddit: { title: string; sentiment: 'bullish' | 'bearish' | 'neutral'; score: number } | null;
}

/**
 * Fetch current stock price from Finnhub
 */
async function fetchStockPrice(symbol: string): Promise<{ price: number; changePercent: number } | null> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      console.warn('FINNHUB_API_KEY not configured');
      return null;
    }

    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
    const data = await response.json();

    if (data.c && data.dp !== undefined) {
      return {
        price: data.c,
        changePercent: data.dp,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch news for a specific stock
 */
async function fetchStockNews(symbol: string): Promise<Array<{ headline: string; summary: string }>> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return [];

    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate = lastWeek.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${apiKey}`
    );
    const data = await response.json();

    // Get top 2 most recent news
    return data.slice(0, 2).map((item: any) => ({
      headline: item.headline,
      summary: item.summary || '',
    }));
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}

/**
 * Fetch Reddit sentiment for a stock
 */
async function fetchRedditSentiment(symbol: string): Promise<{ title: string; sentiment: 'bullish' | 'bearish' | 'neutral'; score: number } | null> {
  try {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    // Get Reddit access token
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) return null;

    // Search for posts about this symbol
    const searchResponse = await fetch(
      `https://oauth.reddit.com/r/wallstreetbets/search?q=${symbol}&restrict_sr=1&sort=hot&limit=3`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'WealthyRabbit:v1.0.0',
        },
      }
    );

    const searchData = await searchResponse.json();

    if (searchData.data?.children?.length > 0) {
      const post = searchData.data.children[0].data;
      const title = post.title.toLowerCase();

      // Determine sentiment from title
      const isBullish = title.includes('moon') || title.includes('buy') || title.includes('calls') ||
                        title.includes('rocket') || title.includes('squeeze') || title.includes('bullish') ||
                        title.includes('🚀') || title.includes('💎');
      const isBearish = title.includes('puts') || title.includes('short') || title.includes('crash') ||
                        title.includes('bearish') || title.includes('dump') || title.includes('rug');

      return {
        title: post.title,
        sentiment: isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral',
        score: post.score,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Reddit for ${symbol}:`, error);
    return null;
  }
}

/**
 * Build a balanced narrative for a single stock
 * Shows both bull and bear perspectives when available
 */
function buildStockNarrative(stock: StockContext): string {
  const { symbol, price, changePercent, news, reddit } = stock;
  const isGaining = changePercent >= 0;
  const absChange = Math.abs(changePercent);

  let narrative = `*${symbol}*\n`;

  // What happened (news-driven if available)
  if (news.length > 0) {
    const mainNews = news[0];
    narrative += `What happened: ${mainNews.headline}\n`;

    // Brief context if available
    if (mainNews.summary && mainNews.summary.length > 0) {
      const summary = mainNews.summary.length > 80
        ? mainNews.summary.substring(0, 80) + '...'
        : mainNews.summary;
      narrative += `${summary}\n`;
    }
  } else {
    // No news - describe price action
    if (absChange > 3) {
      narrative += `What happened: ${isGaining ? 'Strong rally' : 'Sharp pullback'} — ${isGaining ? '+' : ''}${changePercent.toFixed(1)}%\n`;
    } else if (absChange > 1) {
      narrative += `What happened: ${isGaining ? 'Steady climb' : 'Modest decline'} — ${isGaining ? '+' : ''}${changePercent.toFixed(1)}%\n`;
    } else {
      narrative += `What happened: Trading relatively flat — ${isGaining ? '+' : ''}${changePercent.toFixed(1)}%\n`;
    }
  }

  // Reddit sentiment (balanced view)
  if (reddit) {
    if (reddit.sentiment === 'bullish') {
      narrative += `Reddit says: Retail's excited (${reddit.score.toLocaleString()} upvotes) — but also: remember echo chambers exist.\n`;
    } else if (reddit.sentiment === 'bearish') {
      narrative += `Reddit says: Bearish chatter building (${reddit.score.toLocaleString()} upvotes) — but also: sentiment can flip fast.\n`;
    } else {
      narrative += `Reddit says: Mixed signals (${reddit.score.toLocaleString()} upvotes) — healthy debate happening.\n`;
    }
  } else {
    // No Reddit data - provide balanced take on price action
    if (absChange > 3) {
      narrative += `Reddit says: ${isGaining ? 'Likely seeing excitement build' : 'Caution probably spreading'} — but also: ${isGaining ? 'momentum can fade quickly' : 'dips often bring buyers'}.\n`;
    } else {
      narrative += `Reddit says: Not much chatter yet — which could mean flying under radar or simply quiet day.\n`;
    }
  }

  // Experts/Analysts view (balanced interpretation)
  if (news.length > 1) {
    // Multiple news items suggest analyst attention
    narrative += `Experts: Getting coverage — ${isGaining ? 'positive catalysts noted' : 'concerns being raised'}. ${isGaining ? 'But remember: analysts chase momentum.' : 'Though selling often creates entry points.'}\n`;
  } else if (news.length === 1) {
    narrative += `Experts: Some attention — ${isGaining ? 'optimism emerging' : 'caution advised'}. Always worth reading full context though.\n`;
  } else {
    // No analyst coverage
    narrative += `Experts: Quiet from analysts — ${isGaining ? 'sleeper momentum or just noise?' : 'ignored for now, but watch for changes'}.\n`;
  }

  // Current feel (calm, balanced assessment)
  if (absChange > 5) {
    narrative += `Current feel: Big move. ${isGaining ? 'Exciting, but check if it\'s sustainable' : 'Painful, but sometimes these shake out weak hands'}. At $${price.toFixed(2)}.`;
  } else if (absChange > 2) {
    narrative += `Current feel: Solid ${isGaining ? 'momentum' : 'pressure'}. ${isGaining ? 'Buyers showing up' : 'Sellers in control for now'}. At $${price.toFixed(2)}.`;
  } else {
    narrative += `Current feel: Calm day. Nothing dramatic, just normal flow. At $${price.toFixed(2)}.`;
  }

  return narrative;
}

/**
 * POST /api/briefing/send-now
 * Send an on-demand briefing to the user via Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`📊 On-demand briefing requested for user: ${userId}`);

    // Get user with holdings and settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        holdings: true,
        notificationSettings: true,
      },
    });

    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if Telegram is configured
    if (!user.telegramChatId) {
      console.log(`⚠️  User ${userId} has no Telegram chat ID`);
      return NextResponse.json(
        { error: 'Telegram not linked. Please connect your Telegram account first.' },
        { status: 400 }
      );
    }

    // Handle no holdings case
    if (user.holdings.length === 0) {
      console.log(`ℹ️  User ${userId} has no holdings`);
      const message = '📊 *Right-Now Briefing*\n\n' +
                     'You don\'t have any holdings yet.\n' +
                     'Add some stocks to your portfolio to get personalized briefings!\n\n' +
                     '🐇 WealthyRabbit';

      const result = await sendTelegramMessage(user.telegramChatId, message);

      if (result.success) {
        console.log(`✅ Empty briefing sent to user ${userId}`);
        return NextResponse.json({ ok: true, message: 'Briefing sent!' });
      } else {
        console.error(`❌ Failed to send briefing: ${result.error}`);
        return NextResponse.json(
          { error: 'Failed to send message. Please try again.' },
          { status: 500 }
        );
      }
    }

    console.log(`📈 Gathering context for ${user.holdings.length} holdings...`);

    // Gather context for each holding (limit to first 5 to stay under character limit)
    const holdingsToAnalyze = user.holdings.slice(0, 5);
    const stockContexts: StockContext[] = [];

    for (const holding of holdingsToAnalyze) {
      console.log(`  Fetching data for ${holding.symbol}...`);

      const [priceData, news, reddit] = await Promise.all([
        fetchStockPrice(holding.symbol),
        fetchStockNews(holding.symbol),
        fetchRedditSentiment(holding.symbol),
      ]);

      if (!priceData) {
        console.warn(`  ⚠️  No price data for ${holding.symbol}, skipping`);
        continue;
      }

      stockContexts.push({
        symbol: holding.symbol,
        price: priceData.price,
        changePercent: priceData.changePercent,
        news,
        reddit,
      });
    }

    if (stockContexts.length === 0) {
      console.log(`❌ Could not fetch data for any holdings`);
      return NextResponse.json(
        { error: 'Unable to fetch market data. Please try again later.' },
        { status: 500 }
      );
    }

    // Build the briefing message
    let message = '📊 *Right-Now Briefing*\n\n';
    message += 'I read everything for you — here\'s both sides.\n\n';

    const narratives = stockContexts.map(stock => buildStockNarrative(stock));
    message += narratives.join('\n\n');

    // Check message length and truncate if needed
    if (message.length > 1300) {
      const truncateCount = stockContexts.length - 3;
      message = '📊 *Right-Now Briefing*\n\n';
      message += 'I read everything for you — here\'s both sides.\n\n';
      message += narratives.slice(0, 3).join('\n\n');
      message += `\n\n(+${truncateCount} more in your portfolio...)`;
    }

    message += '\n\n🐇 WealthyRabbit';

    console.log(`📤 Sending briefing (${message.length} chars) to user ${userId}`);

    // Send via Telegram
    const result = await sendTelegramMessage(user.telegramChatId, message);

    if (result.success) {
      console.log(`✅ Briefing sent successfully to user ${userId}`);
      return NextResponse.json({ ok: true, message: 'Briefing sent to your Telegram!' });
    } else {
      console.error(`❌ Failed to send briefing: ${result.error}`);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error in send-now briefing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
