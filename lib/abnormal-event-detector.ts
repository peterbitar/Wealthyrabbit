/**
 * Abnormal Event Detection System
 *
 * Only triggers notifications when something out of the ordinary happens.
 * No daily summaries, no noise — only "Whoa, that's interesting" moments.
 */

import { prisma } from './prisma';
import { sendTelegramMessage, sendTelegramMessageWithDelay, sendNotificationWithVoiceNotes } from './telegram';
import OpenAI from 'openai';

// Track sent events to prevent duplicates (userId -> Set of event signatures)
const sentEvents = new Map<string, Set<string>>();

// Track last message time per user (userId -> timestamp)
const lastMessageTime = new Map<string, number>();

// Check if we should greet (first message in 4+ hours)
function shouldGreet(userId: string): boolean {
  const lastTime = lastMessageTime.get(userId);
  if (!lastTime) return true; // First message ever

  const fourHours = 4 * 60 * 60 * 1000;
  return Date.now() - lastTime > fourHours;
}

// Update last message time
function updateLastMessageTime(userId: string): void {
  lastMessageTime.set(userId, Date.now());
}

// Generate signature for an event to detect duplicates
function generateEventSignature(symbol: string, eventType: string, changePercent: number): string {
  // Round to 1 decimal to allow for slight variations but catch duplicates
  const roundedChange = Math.round(changePercent * 10) / 10;
  return `${symbol}:${eventType}:${roundedChange}`;
}

// Check if this is a new event or has significant new info
function isNewOrUpdatedEvent(userId: string, signature: string): boolean {
  const userSentEvents = sentEvents.get(userId) || new Set();

  if (userSentEvents.has(signature)) {
    return false; // Already sent this exact event
  }

  return true; // New event
}

// Mark event as sent
function markEventAsSent(userId: string, signature: string): void {
  let userSentEvents = sentEvents.get(userId);
  if (!userSentEvents) {
    userSentEvents = new Set();
    sentEvents.set(userId, userSentEvents);
  }

  userSentEvents.add(signature);

  // Keep only last 50 events per user to prevent memory bloat
  if (userSentEvents.size > 50) {
    const array = Array.from(userSentEvents);
    userSentEvents.clear();
    array.slice(-50).forEach(sig => userSentEvents.add(sig));
  }
}

// Clear old event signatures (older than 24 hours)
export function clearOldEventSignatures(): void {
  // Simple approach: clear all every 24 hours to allow re-alerting on persistent issues
  const now = Date.now();
  const lastClear = (globalThis as any).__lastEventClear || 0;

  if (now - lastClear > 24 * 60 * 60 * 1000) {
    sentEvents.clear();
    (globalThis as any).__lastEventClear = now;
    console.log('🧹 Cleared old event signatures (24h refresh)');
  }
}

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

interface NotificationMessage {
  teaser: string;
  voiceNotes: string[];
}

interface AbnormalEvent {
  symbol: string;
  type: 'price' | 'news' | 'reddit' | 'analyst' | 'sector';
  severity: 'medium' | 'high';
  message: NotificationMessage;
}

/**
 * Helper function to generate a friendly, conversational message
 * @param holdings - Array of stock symbols
 * @param sentiment - Optional sentiment data
 * @param news - Optional news headlines
 * @param shouldGreet - Whether to include a greeting
 * @returns A friendly message ready for Telegram or WhatsApp
 */
export async function generateMessage(options: {
  holdings: Array<{ symbol: string; changePercent: number; currentPrice: number }>;
  sentiment?: { positive: number; negative: number; neutral: number };
  news?: string[];
  shouldGreet?: boolean;
}): Promise<string> {
  try {
    const { holdings, sentiment, news = [], shouldGreet = false } = options;

    // Filter significant movers (>2%)
    const movers = holdings.filter(h => Math.abs(h.changePercent) >= 2);

    if (movers.length === 0) {
      const greeting = shouldGreet ? 'Hey! ' : '';
      return `${greeting}Just checked your holdings, everything's cruising along normally. Markets are pretty calm today 🐇`;
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const greetingInstruction = shouldGreet
      ? 'Start with "Hey!" or "Yo!"'
      : 'Jump straight in, no greeting.';

    const moversText = movers.map(h =>
      `${h.symbol}: ${h.changePercent > 0 ? '+' : ''}${h.changePercent.toFixed(1)}% at $${h.currentPrice.toFixed(2)}`
    ).join(', ');

    const newsContext = news.length > 0
      ? `Recent news: ${news.slice(0, 3).join('. ')}`
      : 'No major news';

    const sentimentText = sentiment
      ? `Sentiment: ${sentiment.positive}% positive, ${sentiment.negative}% negative`
      : '';

    const prompt = `You're texting a friend about their stock portfolio.

${greetingInstruction}

What's moving:
${moversText}

${newsContext}
${sentimentText}

Write a casual 1-2 sentence message about what's happening. Sound natural, like you're genuinely texting them.

Rules:
- Stay under 300 characters
- NO "—" dashes, use commas
- Don't ask questions or prompt responses
- End with 🐇

Example: "Yo, ${movers[0]?.symbol || 'Apple'} popped ${Math.abs(movers[0]?.changePercent || 3).toFixed(1)}% today. Looks like earnings beat expectations, people are hyped 🐇"

Your message:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.9,
    });

    let message = completion.choices[0]?.message?.content || '';

    // Clean up
    message = message.replace(/—/g, ',');
    if (message.length > 1000) {
      message = message.substring(0, 997) + '...';
    }

    return message || `${shouldGreet ? 'Hey! ' : ''}${movers[0]?.symbol} moved ${Math.abs(movers[0]?.changePercent).toFixed(1)}% today 🐇`;
  } catch (error) {
    console.error('Error generating message:', error);
    return `${options.shouldGreet ? 'Hey! ' : ''}Your portfolio has some movement today 🐇`;
  }
}

/**
 * Fetch trending stocks for discovery context
 */
async function fetchTrendingStocks(): Promise<Array<{ symbol: string; dayChangePercent: number; vibe: string }>> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return [];

    // Fetch a few popular stocks for trending context
    const trendingSymbols = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN'];
    const trending: Array<{ symbol: string; dayChangePercent: number; vibe: string }> = [];

    for (const symbol of trendingSymbols.slice(0, 3)) {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
      const data = await response.json();

      if (data.dp !== undefined) {
        const absChange = Math.abs(data.dp);
        let vibe = '';
        if (absChange > 3) vibe = data.dp > 0 ? 'jumping' : 'dipping';
        else if (absChange > 1.5) vibe = data.dp > 0 ? 'climbing' : 'sliding';
        else vibe = 'steady';

        trending.push({
          symbol,
          dayChangePercent: data.dp,
          vibe
        });
      }
    }

    return trending;
  } catch (error) {
    console.error('Error fetching trending stocks:', error);
    return [];
  }
}

/**
 * Fetch market indices for general market context
 */
async function fetchMarketIndices(): Promise<{ spy: number; vix?: number }> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return { spy: 0 };

    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=SPY&token=${apiKey}`);
    const data = await response.json();

    return {
      spy: data.dp || 0
    };
  } catch (error) {
    console.error('Error fetching market indices:', error);
    return { spy: 0 };
  }
}

/**
 * Generate conversational, well-researched message using LLM
 */
async function generateConversationalMessage(
  symbol: string,
  eventType: string,
  stockData: StockData,
  newsData: NewsData,
  volatility: number,
  shouldGreet: boolean = false
): Promise<NotificationMessage> {
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

    // Fetch market context (25% general market trends + 15% discovery)
    const [marketIndices, trendingStocks] = await Promise.all([
      fetchMarketIndices(),
      fetchTrendingStocks()
    ]);

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
      marketContext: {
        spyChange: marketIndices.spy,
        trending: trendingStocks
      }
    };

    const trendingContext = trendingStocks.length > 0
      ? trendingStocks.map(t => `${t.symbol} ${t.vibe} ${t.dayChangePercent > 0 ? '+' : ''}${t.dayChangePercent.toFixed(1)}%`).join(', ')
      : '';

    const marketMoodText = Math.abs(marketIndices.spy) > 1
      ? `Overall market ${marketIndices.spy > 0 ? 'up' : 'down'} ${Math.abs(marketIndices.spy).toFixed(1)}% today.`
      : 'Market pretty steady overall.';

    const prompt = `You're WealthyRabbit 🐇, a calm and conversational market companion. You're messaging your friend about something happening in their portfolio.

Your role: Help people cut through market noise with human-sounding insights. Never robotic, never overwhelming, just helpful and interesting.

CONTENT MIX (important):
- 60% focus on ${context.symbol} (their holding)
- 25% mention broader market context
- 15% note what's trending/interesting elsewhere

Context for ${context.symbol} (their holding):
- Price: $${context.currentPrice.toFixed(2)}, ${context.dayChangePercent > 0 ? 'up' : 'down'} ${Math.abs(context.dayChangePercent).toFixed(1)}%
- This is ${context.volatilityMultiple.toFixed(1)}× the normal daily movement
- News activity: ${context.newsCount6h} articles in 6h (usually ${context.newsAvg7day.toFixed(1)})
- Headlines: ${context.headlines.slice(0, 2).map(h => h.headline).join('. ')}
- Sentiment: shifted from ${context.sentimentPrevious.toFixed(0)} to ${context.sentimentCurrent.toFixed(0)}

Broader market context:
- ${marketMoodText}
${trendingContext ? `- Trending: ${trendingContext}` : ''}

Create a notification with two parts:

TEXT_TEASER (under 140 characters):
- Conversational and natural, like texting a friend
- Specific to what happened (not generic)
- Examples:
  * "Hey, just saw Tesla jump nearly 6% this morning"
  * "Apple's getting attention again, up 3% today"
  * "Nvidia took a dip, down 4% after that earnings report"

VOICE_NOTES (1-3 notes, each under 45 seconds when spoken):
- Sound like a friend casually explaining what they found
- Start naturally: "So I looked into this..." or "After reading Bloomberg..."
- Include:
  * What happened and probably why (casual explanation)
  * How it fits with the broader market ("The whole market's up today..." or "While everything else is steady...")
  * Quick mention of something trending/interesting ("Also noticed Tesla's climbing..." or "By the way, Apple's getting attention...")
  * Different perspectives ("On Reddit, people are split...")
  * Light personal take ("Kinda interesting how...")
- End conversationally:
  * "Check the app for a deep dive."
  * "Interesting trend, right?"
  * "I'm curious what you think about this one."
- NO "—" character ever, use commas or natural breaks
- Keep it under 45 seconds per voice note
- Simple words, no jargon unless explaining it casually

Tone:
- Friendly, never formal or analytical
- "Probably linked to..." not "This indicates..."
- "Looks like" not "Analysis shows"
- Natural curiosity, not robotic certainty

Format EXACTLY like this:

TEXT_TEASER:
[your teaser]

VOICE_NOTES:
1. [voice note #1 script]
2. [voice note #2 script if more to say]

Write it now:`;



    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: 1000,
      temperature: 0.8,
    });

    let responseText = completion.choices[0]?.message?.content || '';

    // Ensure no em-dashes
    responseText = responseText.replace(/—/g, ',');

    // Parse the response
    const teaserMatch = responseText.match(/TEXT_TEASER:\s*\n(.+?)(?=\n\s*VOICE_NOTES:|$)/s);
    const voiceNotesMatch = responseText.match(/VOICE_NOTES:\s*\n([\s\S]+?)$/);

    if (teaserMatch && voiceNotesMatch) {
      const teaser = teaserMatch[1].trim();
      const voiceNotesText = voiceNotesMatch[1];

      // Extract individual voice notes (numbered 1., 2., 3.)
      const voiceNotes: string[] = [];
      const noteMatches = voiceNotesText.matchAll(/\d+\.\s*(.+?)(?=\n\s*\d+\.|$)/gs);

      for (const match of noteMatches) {
        voiceNotes.push(match[1].trim());
      }

      // Limit to 3 voice notes
      return {
        teaser,
        voiceNotes: voiceNotes.slice(0, 3)
      };
    }

    // Fallback if parsing fails
    const greeting = shouldGreet ? 'Hey, ' : '';
    const direction = stockData.dayChangePercent > 0 ? 'up' : 'down';
    const fallbackTeaser = `${greeting}just saw ${symbol} ${direction} ${Math.abs(stockData.dayChangePercent).toFixed(1)}% today`;
    const fallbackVoiceNote = `So ${symbol} just moved ${Math.abs(stockData.dayChangePercent).toFixed(1)}%. ${newsData.headlines.length > 0 ? 'Probably linked to ' + newsData.headlines[0].headline.toLowerCase() + '.' : 'Still looking into what triggered it.'} Kinda interesting move, about ${(Math.abs(stockData.dayChangePercent) / volatility).toFixed(1)} times the normal daily swing. Check the app for a deep dive.`;

    return {
      teaser: fallbackTeaser,
      voiceNotes: [fallbackVoiceNote]
    };
  } catch (error) {
    console.error('Error generating conversational message:', error);
    // Fallback message
    const greeting = shouldGreet ? 'Hey, ' : '';
    const direction = stockData.dayChangePercent > 0 ? 'up' : 'down';
    const fallbackTeaser = `${greeting}${symbol} ${direction} ${Math.abs(stockData.dayChangePercent).toFixed(1)}% today`;
    const fallbackVoiceNote = `Just noticed ${symbol} moved ${Math.abs(stockData.dayChangePercent).toFixed(1)}% today. Check the app for a deep dive.`;

    return {
      teaser: fallbackTeaser,
      voiceNotes: [fallbackVoiceNote]
    };
  }
}

/**
 * Generate a summary message for multiple events
 */
async function generateMultiEventSummary(
  events: AbnormalEvent[],
  shouldGreet: boolean
): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const greetingInstruction = shouldGreet
      ? 'Start with "Hey!" or "Yo!" since this is your first message today.'
      : 'Jump straight in, no greeting.';

    const symbols = events.map(e => e.symbol);
    const symbolsText = symbols.length > 3
      ? `${symbols.slice(0, 3).join(', ')} and ${symbols.length - 3} others`
      : symbols.join(', ');

    const prompt = `You're texting your friend about some movement in their portfolio.

${greetingInstruction}

Stocks moving: ${symbolsText}

Write a super casual intro (1-2 sentences) that naturally mentions what's happening and that you'll break it down. Sound like you're genuinely texting them.

Rules:
- Keep it under 200 characters
- NO "—" dashes ever, use commas
- Sound excited but not over the top
- End with 🐇
- No questions, no prompts for responses

Example: "Hey, saw some action today. ${symbols[0]}, ${symbols[1] || 'another stock'}, and a few more moving. Here's what's up 🐇"

Write your message:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: 80,
      temperature: 0.9,
    });

    let messageText = completion.choices[0]?.message?.content || '';

    // Ensure no em-dashes
    messageText = messageText.replace(/—/g, ',');

    if (messageText) {
      return messageText;
    }

    // Fallback
    const symbolList = events.map(e => e.symbol).join(', ');
    return shouldGreet
      ? `Hey! ${symbolList} all moving today. Here's the breakdown 🐇`
      : `${symbolList} moving. Here's what's happening 🐇`;
  } catch (error) {
    console.error('Error generating multi-event summary:', error);
    const symbolList = events.map(e => e.symbol).join(', ');
    return shouldGreet
      ? `Hey! ${symbolList} all moving 🐇`
      : `${symbolList} moving 🐇`;
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

    // NOTE: shouldGreet will be handled at the sending level, not here
    // We generate messages without greeting, it gets added when sending if needed
    const message = await generateConversationalMessage(
      symbol,
      eventType,
      stockData,
      newsData,
      volatility,
      false // Never greet in individual event messages - greeting handled in summary/first message
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

    // Clear old signatures periodically
    clearOldEventSignatures();

    // Filter out duplicate events
    const newEvents = allEvents.filter(event => {
      // Get the stock data to extract change percent
      const holding = user.holdings.find(h => h.symbol === event.symbol);
      if (!holding) return false;

      // Generate signature for this event
      const signature = generateEventSignature(event.symbol, event.type, 0); // We'll use a simplified signature

      // Check if it's new or updated
      if (!isNewOrUpdatedEvent(userId, signature)) {
        console.log(`⏭️  Skipping duplicate event: ${event.symbol} - ${event.type}`);
        return false;
      }

      return true;
    });

    // Check if we should greet (first message in 4+ hours)
    const shouldGreetUser = shouldGreet(userId);

    if (newEvents.length === 0) {
      console.log(`✅ No abnormal events detected for user ${userId}`);

      // If this is a manual check, send a "markets are quiet" message
      if (sendQuietMessage) {
        const greeting = shouldGreetUser ? 'Hey, ' : '';
        const quietMessage = `${greeting}just checked your portfolio. Everything's moving within pretty normal ranges today, nothing jumping out as super interesting right now.\n\nI'm keeping an eye on things though. Check the app for a deep dive.`;
        await sendTelegramMessageWithDelay(user.telegramChatId, quietMessage);
        updateLastMessageTime(userId);
      }
      return;
    }

    console.log(`📨 Sending ${newEvents.length} event(s) to user ${userId}`);

    // If multiple events (2+), send a summary first
    if (newEvents.length >= 2) {
      console.log(`📊 Generating summary for ${newEvents.length} events`);
      const summary = await generateMultiEventSummary(newEvents, shouldGreetUser);
      await sendTelegramMessageWithDelay(user.telegramChatId, summary);

      // Wait a bit before sending details
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Send individual event details
    for (let i = 0; i < newEvents.length; i++) {
      const event = newEvents[i];
      console.log(`🚨 Event ${i + 1}/${newEvents.length}: ${event.symbol} - ${event.type}`);

      let teaser = event.message.teaser;
      let voiceNotes = [...event.message.voiceNotes];

      // If single event and should greet, add greeting to first voice note
      if (newEvents.length === 1 && shouldGreetUser) {
        if (voiceNotes.length > 0 && !voiceNotes[0].startsWith('Hey!') && !voiceNotes[0].startsWith('Yo!')) {
          voiceNotes[0] = `Hey! ${voiceNotes[0]}`;
        }
      }

      // If multiple events, remove greeting from individual messages (summary already greeted)
      if (newEvents.length >= 2 && voiceNotes.length > 0) {
        voiceNotes[0] = voiceNotes[0].replace(/^(Hey!|Yo!|Hi!)\s*/, '');
      }

      // Send notification with voice notes
      await sendNotificationWithVoiceNotes(user.telegramChatId, teaser, voiceNotes);

      // Mark as sent
      const signature = generateEventSignature(event.symbol, event.type, 0);
      markEventAsSent(userId, signature);

      // Wait between events
      if (i < newEvents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Note: Closing message is now included in each voice note

    // Update last message time
    updateLastMessageTime(userId);

    console.log(`✅ Processed ${newEvents.length} events for user ${userId}`);

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
