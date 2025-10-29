/**
 * Abnormal Event Detection System
 *
 * Only triggers notifications when something out of the ordinary happens.
 * No daily summaries, no noise — only "Whoa, that's interesting" moments.
 */

import { prisma } from './prisma';
import { sendTelegramMessage } from './telegram';

interface StockData {
  symbol: string;
  currentPrice: number;
  dayChangePercent: number;
  intradayChangePercent: number;
  gapPercent: number;
  volume: number;
}

interface NewsData {
  count6h: number;
  avg7day: number;
  headlines: Array<{ headline: string; sentiment: number }>;
  sentimentCurrent: number;
  sentimentPrevious: number;
}

interface RedditData {
  mentions: number;
  avg7day: number;
  sentiment: number;
  sentimentPrevious: number;
  topPost: { title: string; score: number } | null;
}

interface AnalystData {
  changes24h: number;
  hasTier1Coverage: boolean;
  consensusChange: number;
}

interface AbnormalEvent {
  symbol: string;
  type: 'price' | 'news' | 'reddit' | 'analyst' | 'sector';
  severity: 'medium' | 'high';
  message: string;
}

/**
 * Calculate 20-day historical volatility
 */
async function calculate20DayVolatility(symbol: string): Promise<number> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return 2.0; // Default volatility if unavailable

    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (20 * 24 * 60 * 60);

    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${startDate}&to=${endDate}&token=${apiKey}`
    );
    const data = await response.json();

    if (data.c && data.c.length > 1) {
      // Calculate daily returns
      const returns = [];
      for (let i = 1; i < data.c.length; i++) {
        const dailyReturn = ((data.c[i] - data.c[i - 1]) / data.c[i - 1]) * 100;
        returns.push(dailyReturn);
      }

      // Calculate standard deviation (volatility)
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      return Math.sqrt(variance);
    }

    return 2.0; // Default if calculation fails
  } catch (error) {
    console.error(`Error calculating volatility for ${symbol}:`, error);
    return 2.0;
  }
}

/**
 * Fetch and analyze news for abnormalities
 */
async function analyzeNews(symbol: string): Promise<NewsData> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return { count6h: 0, avg7day: 0, headlines: [], sentimentCurrent: 0, sentimentPrevious: 0 };

    const now = Math.floor(Date.now() / 1000);
    const sixHoursAgo = now - (6 * 60 * 60);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60);

    // Fetch last 7 days of news
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate = lastWeek.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${apiKey}`
    );
    const newsItems = await response.json();

    if (!Array.isArray(newsItems)) {
      return { count6h: 0, avg7day: 0, headlines: [], sentimentCurrent: 0, sentimentPrevious: 0 };
    }

    // Count news in last 6 hours
    const count6h = newsItems.filter((item: any) => item.datetime >= sixHoursAgo).length;

    // Average news per 6h window over 7 days
    const totalNews = newsItems.length;
    const avg7day = totalNews / (7 * 4); // 4 six-hour windows per day

    // Extract key headlines from last 6 hours
    const recentNews = newsItems
      .filter((item: any) => item.datetime >= sixHoursAgo)
      .slice(0, 2);

    const headlines = recentNews.map((item: any) => ({
      headline: item.headline,
      sentiment: item.sentiment || 0,
    }));

    // Calculate sentiment
    const currentSentiment = recentNews.reduce((acc: number, item: any) => acc + (item.sentiment || 0), 0) / Math.max(recentNews.length, 1);
    const olderNews = newsItems.filter((item: any) => item.datetime < sixHoursAgo && item.datetime >= sevenDaysAgo);
    const previousSentiment = olderNews.reduce((acc: number, item: any) => acc + (item.sentiment || 0), 0) / Math.max(olderNews.length, 1);

    return {
      count6h,
      avg7day,
      headlines,
      sentimentCurrent: currentSentiment * 100,
      sentimentPrevious: previousSentiment * 100,
    };
  } catch (error) {
    console.error(`Error analyzing news for ${symbol}:`, error);
    return { count6h: 0, avg7day: 0, headlines: [], sentimentCurrent: 0, sentimentPrevious: 0 };
  }
}

/**
 * Check for abnormal events on a single stock
 */
async function detectAbnormalEvents(symbol: string, stockData: StockData): Promise<AbnormalEvent[]> {
  const events: AbnormalEvent[] = [];

  // 1. Price Movement Detection
  const volatility = await calculate20DayVolatility(symbol);
  const newsData = await analyzeNews(symbol);

  // Price spike relative to volatility
  if (Math.abs(stockData.dayChangePercent) >= 2 * volatility && newsData.count6h > 0) {
    const direction = stockData.dayChangePercent > 0 ? 'jumped' : 'dropped';
    const multiple = Math.abs(stockData.dayChangePercent) / volatility;
    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    let message = `🚨 *${symbol} ${direction.toUpperCase()} ${Math.abs(stockData.dayChangePercent).toFixed(1)}%*\n`;
    message += `${timeStr}\n\n`;
    message += `This is ${multiple.toFixed(1)}× its usual daily swing (20-day volatility: ${volatility.toFixed(1)}%).\n\n`;

    // Add detailed news context
    if (newsData.headlines.length > 0) {
      message += `*What triggered it:*\n`;

      const keyEvents = ['earnings', 'merger', 'lawsuit', 'CEO', 'SEC', 'product launch', 'acquisition', 'FDA', 'deal', 'guidance'];
      const hasKeyEvent = newsData.headlines.some(h =>
        keyEvents.some(keyword => h.headline.toLowerCase().includes(keyword))
      );

      // Show multiple headlines for better context
      newsData.headlines.slice(0, 2).forEach((h, idx) => {
        message += `• ${h.headline}\n`;
      });
      message += `\n`;

      // Analyze sentiment shift
      const sentimentShift = newsData.sentimentCurrent - newsData.sentimentPrevious;
      if (Math.abs(sentimentShift) > 20) {
        message += `*Sentiment shift:* News turned ${sentimentShift > 0 ? 'more positive' : 'more negative'} (${Math.abs(sentimentShift).toFixed(0)} point swing).\n\n`;
      }

      // Build theory
      message += `*Why this might be happening:*\n`;

      if (hasKeyEvent) {
        const earningsRelated = newsData.headlines.some(h =>
          h.headline.toLowerCase().includes('earnings') ||
          h.headline.toLowerCase().includes('revenue') ||
          h.headline.toLowerCase().includes('guidance')
        );
        const regulatoryRelated = newsData.headlines.some(h =>
          h.headline.toLowerCase().includes('sec') ||
          h.headline.toLowerCase().includes('fda') ||
          h.headline.toLowerCase().includes('lawsuit')
        );
        const dealRelated = newsData.headlines.some(h =>
          h.headline.toLowerCase().includes('merger') ||
          h.headline.toLowerCase().includes('acquisition') ||
          h.headline.toLowerCase().includes('deal')
        );

        if (earningsRelated) {
          message += `• Earnings/guidance event — market reassessing future expectations\n`;
          message += `• Often see follow-through moves in next 1-2 days as analysts adjust\n`;
        } else if (regulatoryRelated) {
          message += `• Regulatory/legal development — these can have lasting impacts\n`;
          message += `• Watch for official statements and analyst commentary\n`;
        } else if (dealRelated) {
          message += `• M&A/deal activity — market pricing in strategic shift\n`;
          message += `• Stock typically volatile until deal terms clarify\n`;
        } else {
          message += `• News-driven move — market digesting unexpected information\n`;
          message += `• Volume and follow-through tomorrow will show if it's sustainable\n`;
        }
      } else {
        message += `• High news volume (${newsData.count6h} articles vs avg ${newsData.avg7day.toFixed(1)}) creating attention\n`;
        message += `• Could be algorithmic/momentum trading responding to headlines\n`;
        message += `• Watch for fundamental substance behind the buzz\n`;
      }
    }

    message += `\n🐇`;

    events.push({
      symbol,
      type: 'price',
      severity: Math.abs(stockData.dayChangePercent) >= 5 ? 'high' : 'medium',
      message,
    });
  }

  // Large intraday move
  if (Math.abs(stockData.intradayChangePercent) >= 5) {
    const direction = stockData.intradayChangePercent > 0 ? 'surged' : 'tanked';
    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const dateStr = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    let message = `⚡ *INTRADAY MOVE: ${symbol} ${direction.toUpperCase()} ${Math.abs(stockData.intradayChangePercent).toFixed(1)}%*\n`;
    message += `${dateStr} at ${timeStr}\n\n`;
    message += `This is an unusually sharp mid-day move.\n\n`;

    // Add context about what typically causes intraday spikes
    message += `*Typical causes:*\n`;
    message += `• Breaking news that just hit (check latest headlines)\n`;
    message += `• Large institutional trade or block order\n`;
    message += `• Short squeeze if heavily shorted\n`;
    message += `• Analyst upgrade/downgrade during market hours\n\n`;

    if (newsData.headlines.length > 0) {
      message += `*Latest news:*\n`;
      newsData.headlines.slice(0, 2).forEach(h => {
        message += `• ${h.headline}\n`;
      });
      message += `\n`;
    }

    message += `*Watch for:*\n`;
    message += `• Volume confirmation (is it sustained or just a spike?)\n`;
    message += `• End-of-day close relative to this move\n`;
    message += `• Any official company announcements\n\n`;

    message += `🐇`;

    events.push({
      symbol,
      type: 'price',
      severity: 'high',
      message,
    });
  }

  // Gap open
  if (Math.abs(stockData.gapPercent) >= 4) {
    const direction = stockData.gapPercent > 0 ? 'gapped up' : 'gapped down';
    const now = new Date();
    const dateStr = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    let message = `🌅 *OVERNIGHT GAP: ${symbol} ${direction.toUpperCase()} ${Math.abs(stockData.gapPercent).toFixed(1)}%*\n`;
    message += `${dateStr} premarket\n\n`;
    message += `Stock opened significantly away from yesterday's close — something happened overnight.\n\n`;

    message += `*What causes overnight gaps:*\n`;
    message += `• Earnings released after hours or before market open\n`;
    message += `• Major news announced outside trading hours\n`;
    message += `• International markets reacting (Asia/Europe sessions)\n`;
    message += `• Analyst calls or institutional actions announced overnight\n\n`;

    if (newsData.headlines.length > 0) {
      message += `*Recent headlines:*\n`;
      newsData.headlines.slice(0, 2).forEach(h => {
        message += `• ${h.headline}\n`;
      });
      message += `\n`;
    }

    message += `*Trading implications:*\n`;
    message += `• Large gaps often get "filled" partially during the session\n`;
    message += `• First 30 minutes will show if buyers/sellers defend the gap\n`;
    message += `• If gap holds all day, it signals strong conviction\n\n`;

    message += `🐇`;

    events.push({
      symbol,
      type: 'price',
      severity: 'high',
      message,
    });
  }

  // 2. News Surge Detection
  if (newsData.count6h >= 2 * newsData.avg7day && newsData.count6h >= 2) {
    const multiple = newsData.count6h / Math.max(newsData.avg7day, 0.5);
    const now = new Date();
    const dateStr = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = now.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    let message = `📰 *NEWS SURGE: ${symbol}*\n`;
    message += `${dateStr} at ${timeStr}\n\n`;
    message += `${newsData.count6h} articles in the last 6 hours — that's ${multiple.toFixed(1)}× the normal rate (avg: ${newsData.avg7day.toFixed(1)} per 6h).\n\n`;

    if (newsData.headlines.length > 0) {
      message += `*What's being reported:*\n`;
      newsData.headlines.forEach(h => {
        message += `• ${h.headline}\n`;
      });
      message += `\n`;
    }

    message += `*Why this matters:*\n`;
    message += `• Media attention often precedes or follows price moves\n`;
    message += `• ${newsData.count6h >= 5 ? 'This level of coverage is unusual — something significant happening' : 'Increased attention from financial press'}\n`;
    message += `• Retail traders often react to headlines, creating momentum\n\n`;

    message += `*Context:*\n`;
    if (multiple >= 4) {
      message += `• This is an extreme news spike — rare event\n`;
      message += `• Usually triggered by: earnings, M&A, regulatory action, or crisis\n`;
      message += `• Expect high volatility as market digests information\n`;
    } else {
      message += `• Moderate increase in coverage\n`;
      message += `• Could be developing story or quarterly event\n`;
      message += `• Monitor for price action confirmation\n`;
    }

    message += `\n🐇`;

    events.push({
      symbol,
      type: 'news',
      severity: multiple >= 4 ? 'high' : 'medium',
      message,
    });
  }

  // Sentiment flip
  const sentimentChange = Math.abs(newsData.sentimentCurrent - newsData.sentimentPrevious);
  if (sentimentChange >= 30 && newsData.count6h >= 2) {
    const direction = newsData.sentimentCurrent > newsData.sentimentPrevious ? 'turned bullish' : 'turned bearish';
    const now = new Date();
    const dateStr = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    let message = `💭 *SENTIMENT SHIFT: ${symbol}*\n`;
    message += `${dateStr}\n\n`;
    message += `News sentiment ${direction} — ${sentimentChange.toFixed(0)} point swing.\n\n`;

    message += `*The numbers:*\n`;
    message += `• Recent sentiment: ${newsData.sentimentCurrent.toFixed(0)}/100 (${newsData.sentimentCurrent > 50 ? 'positive' : newsData.sentimentCurrent < 50 ? 'negative' : 'neutral'})\n`;
    message += `• Previous sentiment: ${newsData.sentimentPrevious.toFixed(0)}/100 (${newsData.sentimentPrevious > 50 ? 'positive' : newsData.sentimentPrevious < 50 ? 'negative' : 'neutral'})\n`;
    message += `• Change: ${newsData.sentimentCurrent > newsData.sentimentPrevious ? '+' : ''}${(newsData.sentimentCurrent - newsData.sentimentPrevious).toFixed(0)} points\n\n`;

    if (newsData.headlines.length > 0) {
      message += `*Recent headlines driving sentiment:*\n`;
      newsData.headlines.slice(0, 2).forEach(h => {
        const sentimentLabel = h.sentiment > 0.2 ? '📈 Positive' : h.sentiment < -0.2 ? '📉 Negative' : '➡️ Neutral';
        message += `${sentimentLabel}: ${h.headline}\n`;
      });
      message += `\n`;
    }

    message += `*What sentiment shifts reveal:*\n`;
    if (newsData.sentimentCurrent > newsData.sentimentPrevious) {
      message += `• Narrative changing from cautious to optimistic\n`;
      message += `• Could signal bottom forming or positive catalyst emerging\n`;
      message += `• Watch if this translates to actual buying pressure\n`;
    } else {
      message += `• Tone shifting from positive to concerning\n`;
      message += `• May indicate emerging risks or disappointment\n`;
      message += `• Often leads price action by 1-2 days\n`;
    }

    message += `\n*Remember:* Sentiment is a leading indicator but not always accurate. Cross-reference with fundamentals.\n\n`;
    message += `🐇`;

    events.push({
      symbol,
      type: 'news',
      severity: 'medium',
      message,
    });
  }

  return events;
}

/**
 * Check all user holdings for abnormal events
 * @param userId - User ID to check
 * @param sendQuietMessage - If true, send a message even when no events found (for manual checks)
 */
export async function checkAbnormalEventsForUser(userId: string, sendQuietMessage: boolean = false): Promise<void> {
  try {
    console.log(`🔍 Checking abnormal events for user ${userId}`);

    // Get user with holdings and notification settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        holdings: true,
        notificationSettings: true,
      },
    });

    if (!user || !user.telegramChatId || !user.notificationSettings?.telegram) {
      console.log(`⏭️  User ${userId} not eligible for notifications`);
      return;
    }

    if (user.holdings.length === 0) {
      console.log(`ℹ️  User ${userId} has no holdings`);
      return;
    }

    // Fetch current data for all holdings
    const allEvents: AbnormalEvent[] = [];

    for (const holding of user.holdings) {
      try {
        const apiKey = process.env.FINNHUB_API_KEY;
        if (!apiKey) continue;

        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${holding.symbol}&token=${apiKey}`);
        const quoteData = await response.json();

        if (!quoteData.c) continue;

        const stockData: StockData = {
          symbol: holding.symbol,
          currentPrice: quoteData.c,
          dayChangePercent: quoteData.dp || 0,
          intradayChangePercent: quoteData.dp || 0, // Simplified - use day change as proxy
          gapPercent: ((quoteData.o - quoteData.pc) / quoteData.pc) * 100 || 0,
          volume: quoteData.v || 0,
        };

        const events = await detectAbnormalEvents(holding.symbol, stockData);
        allEvents.push(...events);
      } catch (error) {
        console.error(`Error checking ${holding.symbol}:`, error);
      }
    }

    // Send notifications for high-severity events immediately, batch medium ones
    const highEvents = allEvents.filter(e => e.severity === 'high');
    const mediumEvents = allEvents.filter(e => e.severity === 'medium');

    // Send high-severity events individually
    for (const event of highEvents) {
      console.log(`🚨 High-severity event: ${event.symbol} - ${event.type}`);
      await sendTelegramMessage(user.telegramChatId, event.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Batch medium events if there are multiple
    if (mediumEvents.length > 0) {
      if (mediumEvents.length === 1) {
        console.log(`📢 Medium event: ${mediumEvents[0].symbol}`);
        await sendTelegramMessage(user.telegramChatId, mediumEvents[0].message);
      } else {
        console.log(`📢 ${mediumEvents.length} medium events detected`);
        const batchMessage = mediumEvents.map(e => e.message).join('\n\n');
        await sendTelegramMessage(user.telegramChatId, batchMessage);
      }
    }

    if (allEvents.length === 0) {
      console.log(`✅ No abnormal events detected for user ${userId}`);

      // If this is a manual check, send a "markets are quiet" message
      if (sendQuietMessage) {
        const quietMessage = `📊 *Event Check Complete*\n\nMarkets look pretty normal right now — no unusual moves in your holdings.\n\nI'm watching for:\n• Big price swings (2× normal volatility)\n• News surges\n• Sentiment flips\n• Analyst activity\n\nYou'll hear from me when something interesting happens. 🐇`;
        await sendTelegramMessage(user.telegramChatId, quietMessage);
      }
    } else {
      console.log(`✅ Processed ${allEvents.length} events for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error checking abnormal events for user ${userId}:`, error);
  }
}

/**
 * Check all active users for abnormal events
 */
export async function runAbnormalEventCheck(): Promise<void> {
  try {
    console.log('🔍 Running abnormal event check across all users...');

    const users = await prisma.user.findMany({
      where: {
        telegramChatId: { not: null },
        notificationSettings: {
          telegram: true,
          portfolioAlerts: true,
        },
      },
      select: { id: true },
    });

    console.log(`Found ${users.length} users with notifications enabled`);

    for (const user of users) {
      await checkAbnormalEventsForUser(user.id);
      // Small delay between users to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('✅ Abnormal event check complete');
  } catch (error) {
    console.error('Error in abnormal event check:', error);
  }
}
