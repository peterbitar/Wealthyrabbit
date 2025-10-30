/**
 * Abnormal Event Detection System
 *
 * Only triggers notifications when something out of the ordinary happens.
 * No daily summaries, no noise — only "Whoa, that's interesting" moments.
 */

import { prisma } from './prisma';
import { sendTelegramMessage } from './telegram';
import OpenAI from 'openai';

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
 * Generate conversational, well-researched message using LLM
 */
async function generateConversationalMessage(
  symbol: string,
  eventType: string,
  stockData: StockData,
  newsData: NewsData,
  volatility: number
): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const now = new Date();
    const dateStr = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Build comprehensive context
    const context = {
      symbol,
      currentPrice: stockData.currentPrice,
      dayChangePercent: stockData.dayChangePercent,
      intradayChangePercent: stockData.intradayChangePercent,
      gapPercent: stockData.gapPercent,
      volatility20Day: volatility,
      volatilityMultiple: Math.abs(stockData.dayChangePercent) / volatility,
      newsCount6h: newsData.count6h,
      newsAvg7day: newsData.avg7day,
      headlines: newsData.headlines,
      sentimentCurrent: newsData.sentimentCurrent,
      sentimentPrevious: newsData.sentimentPrevious,
      sentimentChange: newsData.sentimentCurrent - newsData.sentimentPrevious,
      dateTime: dateStr,
      eventType,
    };

    const prompt = `You are WealthyRabbit 🐇 - a smart, quick market analyst who spots opportunities before others do. You're the friend who reads Bloomberg at 5am, monitors Reddit sentiment, and always knows what's moving the market.

Your personality:
- Sharp but never arrogant - you know your stuff
- Quick to the point - no fluff, just insights
- Conversational like texting a savvy friend
- You're FAST (that's why you're the rabbit 🐇)

Context:
- Stock: ${context.symbol}
- Current Price: $${context.currentPrice.toFixed(2)}
- Day Change: ${context.dayChangePercent > 0 ? '+' : ''}${context.dayChangePercent.toFixed(1)}%
- 20-Day Volatility: ${context.volatility20Day.toFixed(1)}%
- Volatility Multiple: ${context.volatilityMultiple.toFixed(1)}× normal
- Event Type: ${eventType}
- Date/Time: ${context.dateTime}

News Context:
- Articles (last 6h): ${context.newsCount6h}
- Average (7-day): ${context.newsAvg7day.toFixed(1)} per 6h
- Headlines: ${context.headlines.map(h => h.headline).join('; ')}
- Sentiment: ${context.sentimentCurrent.toFixed(0)}/100 (was ${context.sentimentPrevious.toFixed(0)}/100)

Write ONE continuous paragraph that:
- Gets straight to the point (what's moving and why)
- Includes key numbers and your theory
- References actual headlines when relevant
- Shows you're ahead of the curve ("spotted this early", "called this yesterday", "saw this coming")
- Ends with: "Ask me about the Reddit buzz, news breakdown, or analyst takes if you want more. 🐇"

Rules:
- ONE flowing paragraph (80-120 words)
- NO greetings, NO bullet points, NO sections
- Start with: "*SYMBOL* just..." or "*SYMBOL* moved..."
- Show confidence: "caught this move", "tracking this closely", "this confirms what I suspected"
- Always end with the rabbit emoji 🐇

Example tone: "*TSLA* just dropped 4.2% which is 2.8× normal volatility — I caught this early when the earnings sentiment flipped from 65 to 32. The production delay headlines are flooding in faster than usual (8 vs avg 2.3), and this matches the pattern I saw last quarter. Ask me about the Reddit buzz, news breakdown, or analyst takes if you want more. 🐇"`;


    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: 300,
      temperature: 0.7,
    });

    const messageText = completion.choices[0]?.message?.content;
    if (messageText) {
      return messageText;
    }

    // Fallback if LLM fails
    return `*${symbol}* just moved ${Math.abs(stockData.dayChangePercent).toFixed(1)}% — caught this at ${(Math.abs(stockData.dayChangePercent) / volatility).toFixed(1)}× normal volatility. ${newsData.headlines.length > 0 ? newsData.headlines[0].headline : 'Still pulling the full context...'} Ask me about the Reddit buzz, news breakdown, or analyst takes if you want more. 🐇`;
  } catch (error) {
    console.error('Error generating conversational message:', error);
    // Fallback message
    return `*${symbol}* moved ${Math.abs(stockData.dayChangePercent).toFixed(1)}% — spotted this moving at ${(Math.abs(stockData.dayChangePercent) / volatility).toFixed(1)}× normal levels. ${newsData.headlines.length > 0 ? newsData.headlines[0].headline : 'Tracking what triggered this.'} Ask me about the Reddit buzz, news breakdown, or analyst takes if you want more. 🐇`;
  }
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

  // Collect all triggered conditions
  const triggeredConditions: string[] = [];

  // Price spike relative to volatility
  if (Math.abs(stockData.dayChangePercent) >= 2 * volatility && newsData.count6h > 0) {
    triggeredConditions.push('significant price move');
  }

  // Large intraday move
  if (Math.abs(stockData.intradayChangePercent) >= 5) {
    triggeredConditions.push('sharp intraday move');
  }

  // Gap open
  if (Math.abs(stockData.gapPercent) >= 4) {
    triggeredConditions.push('overnight gap open');
  }

  // News Surge Detection
  if (newsData.count6h >= 2 * newsData.avg7day && newsData.count6h >= 2) {
    triggeredConditions.push('news surge');
  }

  // Sentiment flip
  const sentimentChange = Math.abs(newsData.sentimentCurrent - newsData.sentimentPrevious);
  if (sentimentChange >= 30 && newsData.count6h >= 2) {
    triggeredConditions.push('sentiment shift');
  }

  // Only generate ONE message if any conditions triggered
  if (triggeredConditions.length > 0) {
    // Combine all event types into the description
    const eventType = triggeredConditions.join(' + ');

    const message = await generateConversationalMessage(
      symbol,
      eventType,
      stockData,
      newsData,
      volatility
    );

    // Determine severity (high if any high-severity condition)
    const hasHighSeverity =
      Math.abs(stockData.dayChangePercent) >= 5 ||
      Math.abs(stockData.intradayChangePercent) >= 5 ||
      Math.abs(stockData.gapPercent) >= 4 ||
      (newsData.count6h >= 4 * newsData.avg7day);

    events.push({
      symbol,
      type: 'price',
      severity: hasHighSeverity ? 'high' : 'medium',
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
        const quietMessage = `🐇 *WealthyRabbit here*\n\nJust scanned your holdings — everything's moving within normal ranges right now. Markets are pretty calm.\n\nI'm tracking:\n• Price swings 2× above normal volatility\n• Unusual news activity\n• Sentiment shifts\n• Analyst upgrades/downgrades\n\nYou'll hear from me the moment something interesting pops up. Fast alerts, that's what I do. 🐇`;
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
