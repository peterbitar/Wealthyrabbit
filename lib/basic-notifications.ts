/**
 * Basic Notification System - Rabbit Basics MVP
 *
 * Simple, straightforward notifications about holdings + discovery + market news
 * No complex event detection, just helpful updates when things move
 */

import { prisma } from './prisma';
import { sendNotificationWithVoiceNotes, sendTelegramMessage } from './telegram';
import { sendInAppNotification } from './in-app-notifications';
import { generateAndStoreVoiceNotes } from './voice-notes';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });
}

/**
 * Check if we've already sent a notification for this stock today
 */
async function wasNotificationSentToday(
  userId: string,
  symbol: string,
  eventType: string = 'price_move'
): Promise<boolean> {
  try {
    const now = new Date();

    // Check if there's a non-expired notification
    const existingNotification = await prisma.sentNotification.findFirst({
      where: {
        userId,
        symbol,
        eventType,
        expiresAt: {
          gte: now, // Not expired yet
        },
      },
    });

    return existingNotification !== null;
  } catch (error) {
    console.error('Error checking sent notifications:', error);
    // On error, allow the notification (fail open)
    return false;
  }
}

/**
 * Record that we sent a notification (expires in 24 hours)
 */
async function recordSentNotification(
  userId: string,
  symbol: string,
  eventType: string = 'price_move'
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    await prisma.sentNotification.create({
      data: {
        userId,
        symbol,
        eventType,
        sentAt: now,
        expiresAt,
      },
    });

    console.log(`   → Recorded notification: ${symbol} for user ${userId} (expires in 24h)`);
  } catch (error) {
    console.error('Error recording sent notification:', error);
    // Non-critical error, continue
  }
}

/**
 * Clean up expired notifications (run periodically)
 */
async function cleanupExpiredNotifications(): Promise<void> {
  try {
    const now = new Date();

    const result = await prisma.sentNotification.deleteMany({
      where: {
        expiresAt: {
          lt: now, // Expired
        },
      },
    });

    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} expired notifications`);
    }
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
  }
}

interface StockUpdate {
  symbol: string;
  currentPrice: number;
  dayChangePercent: number;
  reason?: string; // News headline or reason for move
}

/**
 * Simple check: Did this stock move enough to notify about?
 */
function isWorthNotifying(changePercent: number): boolean {
  // Notify if stock moved more than 3% either direction
  return Math.abs(changePercent) >= 3;
}

/**
 * Fetch basic stock data
 */
async function fetchStockData(symbol: string): Promise<StockUpdate | null> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
    const data = await response.json();

    if (!data.c || data.c === 0) return null;

    return {
      symbol,
      currentPrice: data.c,
      dayChangePercent: data.dp || 0,
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

interface NewsItem {
  headline: string;
  source: string;
  summary?: string;
}

interface RedditSentiment {
  symbol: string;
  mentionCount: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  topComment?: string;
}

interface StockWithContext {
  symbol: string;
  currentPrice: number;
  dayChangePercent: number;
  newsItems: NewsItem[];
  redditSentiment?: RedditSentiment;
}

/**
 * Fetch multiple news headlines for richer context
 * Returns top 3 news items from the last 24 hours
 */
async function fetchNewsHeadlines(symbol: string): Promise<NewsItem[]> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return [];

    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const fromDate = yesterday.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${apiKey}`
    );
    const newsItems = await response.json();

    if (Array.isArray(newsItems) && newsItems.length > 0) {
      // Return top 3 most recent news items
      return newsItems.slice(0, 3).map((item: any) => ({
        headline: item.headline,
        source: item.source || 'Unknown',
        summary: item.summary,
      }));
    }

    return [];
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}

/**
 * Fetch Reddit sentiment for a stock
 * Simulated for now - in production, use Reddit API or social sentiment API
 */
async function fetchRedditSentiment(symbol: string): Promise<RedditSentiment | undefined> {
  try {
    // For MVP, simulate Reddit sentiment based on stock movement
    // In production, replace with actual Reddit API call
    const mentionCount = Math.floor(Math.random() * 500) + 50;
    const sentiments: ('bullish' | 'bearish' | 'neutral')[] = ['bullish', 'bearish', 'neutral'];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

    const comments = [
      'This stock is undervalued, great entry point',
      'Just bought more shares, feeling bullish',
      'Selling my position, too risky right now',
      'Holding long term, fundamentals are strong',
      'Waiting for a dip to add more',
    ];

    return {
      symbol,
      mentionCount,
      sentiment,
      topComment: comments[Math.floor(Math.random() * comments.length)],
    };
  } catch (error) {
    console.error(`Error fetching Reddit sentiment for ${symbol}:`, error);
    return undefined;
  }
}

/**
 * Smart Messaging Hierarchy
 * Decides whether to send text-only, text+voice, or summary based on complexity
 */
async function generateNotification(
  update: StockUpdate,
  newsItems: NewsItem[]
): Promise<{ textOnly?: string; teaser?: string; voiceNotes?: string[] }> {
  try {
    const direction = update.dayChangePercent > 0 ? 'up' : 'down';
    const emoji = update.dayChangePercent > 0 ? '📈' : '📉';

    // Format news for LLM context
    let newsContext = '';
    if (newsItems.length > 0) {
      newsContext = 'Recent News:\n';
      newsItems.forEach((item, index) => {
        newsContext += `${index + 1}. "${item.headline}" (Source: ${item.source})\n`;
      });
    } else {
      newsContext = 'No major news in the last 24 hours';
    }

    // First, let LLM analyze the situation and decide message type
    const analysisPrompt = `You're WealthyRabbit 🐇, deciding how to message your friend about this stock move.

Stock: ${update.symbol}
Price: $${update.currentPrice.toFixed(2)}, ${direction} ${Math.abs(update.dayChangePercent).toFixed(1)}%

${newsContext}

Decide the best format using the Smart Messaging Hierarchy:

1️⃣ TEXT_ONLY (if it's short and clear, 1-2 points):
→ One concise message that explains everything.
Example: "Tesla's up 4% after strong delivery numbers from Bloomberg. Markets liked it. Check the app for more."

2️⃣ TEXT_TEASER_AND_VOICE (if there's nuance, mixed sources, or unclear cause):
→ Short teaser, then voice note explaining the full story.
Example teaser: "Nvidia's trending again. Here's what's going on 👇"
→ In voice note, reference multiple sources when available

3️⃣ SUMMARY_TO_APP (if it's complex or data-heavy):
→ Calm summary, then direct to app.
Example: "There's a lot happening with energy stocks today, I've summarized it in the app for you."

Guidelines:
- NEVER use "—" character (use commas instead)
- ALWAYS mention news sources casually by name (e.g., "According to Bloomberg...", "Reuters reports...", "After reading CNBC and WSJ...")
- If multiple news sources are provided, reference them naturally (e.g., "Bloomberg and Reuters both mention...")
- Keep tone conversational, like a friend explaining what they noticed
- Voice notes must be ≤ 45 seconds when spoken
- Always end with "Check the app for more" or similar
- If no news is available, say something like "no major headlines yet, but the market's reacting"

Respond with ONLY ONE of these three formats:

FORMAT: TEXT_ONLY
[your complete message]

OR

FORMAT: TEXT_TEASER_AND_VOICE
TEASER:
[your short teaser]
VOICE:
[your 45-second voice note script]

OR

FORMAT: SUMMARY_TO_APP
[your calm summary directing to app]`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse response based on format
    if (responseText.includes('FORMAT: TEXT_ONLY')) {
      const textMatch = responseText.match(/FORMAT: TEXT_ONLY\s*\n([\s\S]+?)$/);
      if (textMatch) {
        return {
          textOnly: textMatch[1].trim().replace(/—/g, ',')
        };
      }
    } else if (responseText.includes('FORMAT: TEXT_TEASER_AND_VOICE')) {
      const teaserMatch = responseText.match(/TEASER:\s*\n(.+?)(?=\n\s*VOICE:|$)/s);
      const voiceMatch = responseText.match(/VOICE:\s*\n([\s\S]+?)$/);

      if (teaserMatch && voiceMatch) {
        return {
          teaser: teaserMatch[1].trim().replace(/—/g, ','),
          voiceNotes: [voiceMatch[1].trim().replace(/—/g, ',')]
        };
      }
    } else if (responseText.includes('FORMAT: SUMMARY_TO_APP')) {
      const summaryMatch = responseText.match(/FORMAT: SUMMARY_TO_APP\s*\n([\s\S]+?)$/);
      if (summaryMatch) {
        return {
          textOnly: summaryMatch[1].trim().replace(/—/g, ',')
        };
      }
    }

    // Fallback: If LLM response is unclear, default to text+voice for safety
    const fallbackTeaser = `${update.symbol}'s ${direction} ${Math.abs(update.dayChangePercent).toFixed(1)}% today. Here's what's going on 👇`;

    let fallbackVoice = `So ${update.symbol} moved ${Math.abs(update.dayChangePercent).toFixed(1)}% ${direction} today. `;
    if (newsItems.length > 0) {
      const sources = newsItems.map(n => n.source).slice(0, 2).join(' and ');
      fallbackVoice += `According to ${sources}, ${newsItems[0].headline.toLowerCase()}. `;
    } else {
      fallbackVoice += 'No major headlines yet, but the market\'s reacting. ';
    }
    fallbackVoice += 'Check the app for more details.';

    return {
      teaser: fallbackTeaser,
      voiceNotes: [fallbackVoice]
    };
  } catch (error) {
    console.error('Error generating notification:', error);

    const direction = update.dayChangePercent > 0 ? 'up' : 'down';

    // Error fallback: Simple text-only
    return {
      textOnly: `${update.symbol} moved ${Math.abs(update.dayChangePercent).toFixed(1)}% ${direction} today. Check the app for details.`
    };
  }
}

/**
 * Generate grouped notification - combining multiple stocks into one themed message
 * Uses multiple sources (news + social) and conversational flow
 */
async function generateGroupedNotification(
  stocks: StockWithContext[]
): Promise<{ textOnly?: string; teaser?: string; voiceNotes?: string[] }> {
  try {
    // Build context for LLM with all stocks and their data
    let stocksContext = '';
    const allSources = new Set<string>();

    stocks.forEach((stock, index) => {
      const direction = stock.dayChangePercent > 0 ? 'up' : 'down';
      stocksContext += `\n${index + 1}. ${stock.symbol}: ${direction} ${Math.abs(stock.dayChangePercent).toFixed(1)}%\n`;

      if (stock.newsItems.length > 0) {
        stocksContext += `   News: ${stock.newsItems.map(n => `"${n.headline}" (${n.source})`).join(', ')}\n`;
        stock.newsItems.forEach(n => allSources.add(n.source));
      } else {
        stocksContext += `   News: No major headlines\n`;
      }

      if (stock.redditSentiment) {
        stocksContext += `   Reddit: ${stock.redditSentiment.sentiment} sentiment, ${stock.redditSentiment.mentionCount} mentions\n`;
        if (stock.redditSentiment.topComment) {
          stocksContext += `   Top comment: "${stock.redditSentiment.topComment}"\n`;
        }
        allSources.add('Reddit');
      }
    });

    const sourcesList = Array.from(allSources).slice(0, 3).join(', ');
    const randomToneStarters = [
      'Looks like',
      'Seems that',
      'From what I\'ve read',
      'After checking',
      'Based on',
    ];
    const toneStarter = randomToneStarters[Math.floor(Math.random() * randomToneStarters.length)];

    const analysisPrompt = `You're WealthyRabbit 🐇, catching your friend up on what's happening across their portfolio.

You have ${stocks.length} stocks moving today:
${stocksContext}

Sources available: ${sourcesList}

YOUR TASK:
Group these stocks by theme (e.g., "AI sector rally", "tech volatility", "interest rate impact", etc.) and write ONE cohesive, conversational message that:

1. Combines related movements into natural narrative
2. Cross-references at least 2 different source types (e.g., Bloomberg + Reddit, CNBC + social sentiment)
3. Keeps it VERY concise - 1-2 sentences max for teasers, 2-3 sentences for full messages
4. Uses conversational tone like a friend texting
5. Start with a variation like "${toneStarter}..." for natural flow
6. NEVER use "—" character (use commas instead)
7. Don't add "Check the app" or similar call-to-actions at the end

Decide format:

1️⃣ TEXT_ONLY (if 1-2 stocks, simple story):
One clean paragraph explaining everything.

2️⃣ TEXT_TEASER_AND_VOICE (if 2-4 stocks with nuance):
Short teaser (1-2 sentences), then ONE voice note covering ALL stocks.
Voice note must be ≤ 45 seconds when spoken.

3️⃣ SUMMARY_TO_APP (if overwhelming, >4 stocks):
Calm summary directing to app.

IMPORTANT: If you choose TEXT_TEASER_AND_VOICE, record ONE voice note for all stocks, not one per stock.

Respond ONLY in one of these formats:

FORMAT: TEXT_ONLY
[your complete grouped message]

OR

FORMAT: TEXT_TEASER_AND_VOICE
TEASER:
[short teaser covering the theme]
VOICE:
[one 45-second voice note covering all stocks]

OR

FORMAT: SUMMARY_TO_APP
[calm summary directing to app]`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 600,
      temperature: 0.8, // Slightly higher for variety
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse response
    if (responseText.includes('FORMAT: TEXT_ONLY')) {
      const textMatch = responseText.match(/FORMAT: TEXT_ONLY\s*\n([\s\S]+?)$/);
      if (textMatch) {
        return {
          textOnly: textMatch[1].trim().replace(/—/g, ',')
        };
      }
    } else if (responseText.includes('FORMAT: TEXT_TEASER_AND_VOICE')) {
      const teaserMatch = responseText.match(/TEASER:\s*\n(.+?)(?=\n\s*VOICE:|$)/s);
      const voiceMatch = responseText.match(/VOICE:\s*\n([\s\S]+?)$/);

      if (teaserMatch && voiceMatch) {
        return {
          teaser: teaserMatch[1].trim().replace(/—/g, ','),
          voiceNotes: [voiceMatch[1].trim().replace(/—/g, ',')]
        };
      }
    } else if (responseText.includes('FORMAT: SUMMARY_TO_APP')) {
      const summaryMatch = responseText.match(/FORMAT: SUMMARY_TO_APP\s*\n([\s\S]+?)$/);
      if (summaryMatch) {
        return {
          textOnly: summaryMatch[1].trim().replace(/—/g, ',')
        };
      }
    }

    // Fallback: Create simple grouped message
    const symbols = stocks.map(s => s.symbol).join(', ');
    const fallbackMessage = `Your holdings are moving today: ${symbols}. ${toneStarter} the sources, there's some interesting activity happening.`;

    return { textOnly: fallbackMessage };
  } catch (error) {
    console.error('Error generating grouped notification:', error);

    const symbols = stocks.map(s => s.symbol).join(', ');
    return {
      textOnly: `${symbols} moved today. Check the app for details.`
    };
  }
}

/**
 * Check user's holdings and send grouped notification
 * Groups all moving stocks into ONE themed message with multiple sources
 */
export async function checkAndNotifyUser(userId: string): Promise<{ sentCount: number; skippedCount: number; movingStocks: string[] }> {
  let sentCount = 0;
  let skippedCount = 0;
  const movingStocks: string[] = [];

  try {
    console.log(`📊 Checking holdings for user ${userId}`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        holdings: true,
        notificationSettings: true,
      },
    });

    // Check if user has at least one notification channel enabled
    const hasInApp = user?.notificationSettings?.inApp ?? true; // Default true for in-app
    const hasTelegram = user?.telegramChatId && user?.notificationSettings?.telegram;

    if (!user || (!hasInApp && !hasTelegram)) {
      console.log(`⏭️  User ${userId} not set up for notifications`);
      return { sentCount, skippedCount, movingStocks };
    }

    if (user.holdings.length === 0) {
      console.log(`ℹ️  User ${userId} has no holdings`);
      return { sentCount, skippedCount, movingStocks };
    }

    // STEP 1: Collect ALL moving stocks with their context
    const stocksToNotify: StockWithContext[] = [];

    for (const holding of user.holdings) {
      const stockData = await fetchStockData(holding.symbol);

      if (!stockData) continue;

      // Only include if it moved significantly
      if (isWorthNotifying(stockData.dayChangePercent)) {
        movingStocks.push(holding.symbol);
        console.log(`📢 ${holding.symbol} moved ${stockData.dayChangePercent.toFixed(1)}%, checking deduplication`);

        // Check if we already notified about this stock today
        const alreadySent = await wasNotificationSentToday(userId, holding.symbol);

        if (alreadySent) {
          console.log(`   ⏭️  Skipping ${holding.symbol} - already notified today`);
          skippedCount++;
          continue;
        }

        console.log(`   ✅ Not sent yet today, including in group`);

        // Fetch multiple news sources
        const newsItems = await fetchNewsHeadlines(holding.symbol);
        console.log(`   → Found ${newsItems.length} news items`);

        // Fetch social sentiment
        const redditSentiment = await fetchRedditSentiment(holding.symbol);
        if (redditSentiment) {
          console.log(`   → Found Reddit sentiment: ${redditSentiment.sentiment}`);
        }

        stocksToNotify.push({
          symbol: holding.symbol,
          currentPrice: stockData.currentPrice,
          dayChangePercent: stockData.dayChangePercent,
          newsItems,
          redditSentiment,
        });
      }
    }

    // STEP 2: If we have stocks to notify, send ONE grouped message
    if (stocksToNotify.length > 0) {
      console.log(`📨 Generating grouped notification for ${stocksToNotify.length} stocks`);

      // Generate ONE notification covering all stocks
      const notification = await generateGroupedNotification(stocksToNotify);

      // Send based on the format
      if (notification.textOnly) {
        console.log(`   → Sending grouped text-only message`);
        // Send to Telegram if connected
        if (user.telegramChatId) {
          await sendTelegramMessage(user.telegramChatId, notification.textOnly);
        }
        // Send to in-app (no voice notes)
        await sendInAppNotification(userId, notification.textOnly, []);
      } else if (notification.teaser && notification.voiceNotes) {
        console.log(`   → Sending grouped teaser + voice note`);

        // Generate and store voice notes for in-app
        console.log(`🎤 Generating ${notification.voiceNotes.length} voice note(s) for in-app...`);
        const voiceNoteUrls = await generateAndStoreVoiceNotes(notification.voiceNotes);

        // Send to Telegram if connected (with voice notes)
        if (user.telegramChatId) {
          await sendNotificationWithVoiceNotes(
            user.telegramChatId,
            notification.teaser,
            notification.voiceNotes
          );
        }

        // Send to in-app (teaser + voice note URLs)
        await sendInAppNotification(userId, notification.teaser, voiceNoteUrls);
      }

      // Record notifications for all stocks
      for (const stock of stocksToNotify) {
        await recordSentNotification(userId, stock.symbol);
      }

      sentCount = stocksToNotify.length;
      console.log(`✅ Sent grouped notification covering ${sentCount} stocks`);
    }

    console.log(`✅ Finished checking user ${userId}`);
    return { sentCount, skippedCount, movingStocks };
  } catch (error) {
    console.error(`Error checking user ${userId}:`, error);
    return { sentCount, skippedCount, movingStocks };
  }
}

/**
 * Check all users with notifications enabled
 */
export async function runBasicNotificationCheck(): Promise<void> {
  try {
    console.log('🔍 Running basic notification check...');

    // Clean up expired notifications first
    await cleanupExpiredNotifications();

    const users = await prisma.user.findMany({
      where: {
        notificationSettings: {
          telegram: true,
        },
      },
      include: {
        holdings: true,
      },
    });

    console.log(`Found ${users.length} users with notifications enabled`);

    for (const user of users) {
      await checkAndNotifyUser(user.id);
    }

    console.log('✅ Basic notification check complete');
  } catch (error) {
    console.error('Error running notification check:', error);
  }
}
