import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

interface StockContext {
  symbol: string;
  price: number;
  changePercent: number;
  monthChangePercent: number;
  news: Array<{ headline: string; summary: string; datetime: number }>;
  reddit: { title: string; sentiment: 'bullish' | 'bearish' | 'neutral'; score: number } | null;
}

/**
 * Fetch current stock price and calculate month change from Finnhub
 */
async function fetchStockPrice(symbol: string): Promise<{ price: number; changePercent: number; monthChangePercent: number } | null> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      console.warn('FINNHUB_API_KEY not configured');
      return null;
    }

    // Get current quote
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
    const data = await response.json();

    if (!data.c || data.dp === undefined) {
      return null;
    }

    // Get historical price from 30 days ago
    const today = Math.floor(Date.now() / 1000);
    const monthAgo = today - (30 * 24 * 60 * 60);

    const histResponse = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${monthAgo}&to=${monthAgo + 86400}&token=${apiKey}`
    );
    const histData = await histResponse.json();

    let monthChangePercent = data.dp; // Default to day change if historical not available

    if (histData.c && histData.c.length > 0) {
      const priceMonthAgo = histData.c[0];
      monthChangePercent = ((data.c - priceMonthAgo) / priceMonthAgo) * 100;
    }

    return {
      price: data.c,
      changePercent: data.dp,
      monthChangePercent,
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch news for a specific stock from the past month
 */
async function fetchStockNews(symbol: string): Promise<Array<{ headline: string; summary: string; datetime: number }>> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return [];

    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = lastMonth.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${apiKey}`
    );
    const data = await response.json();

    // Get top 3 most recent significant news
    return data.slice(0, 3).map((item: any) => ({
      headline: item.headline,
      summary: item.summary || '',
      datetime: item.datetime,
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
 * Focuses on the past month's important moves
 */
function buildStockNarrative(stock: StockContext): string {
  const { symbol, price, changePercent, monthChangePercent, news, reddit } = stock;
  const monthIsGaining = monthChangePercent >= 0;
  const absMonthChange = Math.abs(monthChangePercent);

  let narrative = `*${symbol}* — $${price.toFixed(2)}\n`;

  // Month performance
  if (absMonthChange > 15) {
    narrative += `Past month: ${monthIsGaining ? '🚀 Up' : '📉 Down'} ${monthChangePercent.toFixed(1)}% — significant move.\n\n`;
  } else if (absMonthChange > 5) {
    narrative += `Past month: ${monthIsGaining ? 'Up' : 'Down'} ${monthChangePercent.toFixed(1)}%.\n\n`;
  } else {
    narrative += `Past month: Pretty flat (${monthIsGaining ? '+' : ''}${monthChangePercent.toFixed(1)}%).\n\n`;
  }

  // What happened (news-driven, show multiple if available)
  if (news.length > 0) {
    narrative += `What happened:\n`;
    news.slice(0, 2).forEach((item, idx) => {
      const daysAgo = Math.floor((Date.now() / 1000 - item.datetime) / 86400);
      const timeStr = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
      narrative += `• ${timeStr}: ${item.headline}\n`;
    });
    narrative += `\n`;
  }

  // Reddit sentiment (balanced view)
  if (reddit) {
    if (reddit.sentiment === 'bullish') {
      narrative += `Reddit: Retail's hyped (${reddit.score.toLocaleString()} upvotes). Excitement is real, but crowds can be wrong. Echo chambers form fast in bull markets.\n\n`;
    } else if (reddit.sentiment === 'bearish') {
      narrative += `Reddit: Bearish chatter (${reddit.score.toLocaleString()} upvotes). Fear spreading, but panic often marks bottoms. Sentiment shifts quickly.\n\n`;
    } else {
      narrative += `Reddit: Mixed (${reddit.score.toLocaleString()} upvotes). Healthy debate happening — usually means transition period.\n\n`;
    }
  } else if (absMonthChange > 5) {
    narrative += `Reddit: ${monthIsGaining ? 'Probably buzzing quietly. Retail follows momentum, so expect more chatter if this continues.' : 'Likely cautious. When retail goes quiet during drops, it can signal capitulation or simply disinterest.'}\n\n`;
  }

  // Experts/Analysts view (complete thoughts)
  if (news.length >= 2) {
    narrative += `Experts: Multiple headlines = analysts are paying attention. `;
    if (monthIsGaining) {
      narrative += `They're highlighting catalysts and raising targets. But remember: analysts tend to chase price. They upgrade after runs, downgrade after drops. By the time coverage peaks, smart money is often rotating out.`;
    } else {
      narrative += `Concerns being voiced, caution advised. But here's the flip side: when everyone's bearish and coverage is negative, that's often when value emerges. Analysts are backwards-looking more than they admit.`;
    }
  } else if (news.length === 1) {
    narrative += `Experts: Light coverage. `;
    if (monthIsGaining) {
      narrative += `Optimism starting to emerge. Could be early — before the herd arrives — or could be late-stage FOMO. Context matters.`;
    } else {
      narrative += `Some caution being advised. When only a few are paying attention during weakness, it's worth asking: is this ignored opportunity or justified pessimism?`;
    }
  } else {
    narrative += `Experts: Radio silence. `;
    if (monthIsGaining) {
      narrative += `Flying under the radar. That's either stealth accumulation by smart money, or it's noise that'll fade. Time will tell.`;
    } else {
      narrative += `Completely ignored during this drop. Sometimes that's the best setup — forgotten names that quietly improve while no one's watching.`;
    }
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

    // Analyze all holdings (no limit - send multiple messages if needed)
    const stockContexts: StockContext[] = [];

    for (const holding of user.holdings) {
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
        monthChangePercent: priceData.monthChangePercent,
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

    // Send intro message
    const introMessage = `📊 *Portfolio Briefing*\n\nI read everything for you — here's what happened in the past month.\n\nShowing both sides on ${stockContexts.length} ${stockContexts.length === 1 ? 'holding' : 'holdings'}...`;
    await sendTelegramMessage(user.telegramChatId, introMessage);

    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send one message per stock (or group if small)
    let successCount = 0;
    for (const stock of stockContexts) {
      const narrative = buildStockNarrative(stock);

      console.log(`📤 Sending ${stock.symbol} briefing (${narrative.length} chars)`);

      const result = await sendTelegramMessage(user.telegramChatId, narrative);

      if (result.success) {
        successCount++;
        // Small delay between messages to make it feel more human
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        console.error(`❌ Failed to send ${stock.symbol} briefing: ${result.error}`);
      }
    }

    // Send closing message
    const closingMessage = `\n🐇 That's everything from WealthyRabbit.\n\nQuestions? Just ask.`;
    await sendTelegramMessage(user.telegramChatId, closingMessage);

    if (successCount === stockContexts.length) {
      console.log(`✅ Full briefing sent successfully (${successCount} stocks)`);
      return NextResponse.json({ ok: true, message: `Briefing sent! Check Telegram for ${successCount} updates.` });
    } else if (successCount > 0) {
      console.log(`⚠️  Partial success: ${successCount}/${stockContexts.length} stocks sent`);
      return NextResponse.json({ ok: true, message: `Sent ${successCount}/${stockContexts.length} updates. Check Telegram.` });
    } else {
      console.error(`❌ Failed to send any briefings`);
      return NextResponse.json(
        { error: 'Failed to send briefing. Please try again.' },
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
