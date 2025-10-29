import { prisma } from './prisma';
import { sendTelegramMessage } from './telegram';

interface StockPrice {
  symbol: string;
  price: number;
  changePercent: number;
  timestamp: number;
}

interface UserNotificationState {
  userId: string;
  lastPrices: Map<string, StockPrice>;
}

const userStates = new Map<string, UserNotificationState>();
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function fetchStockPrice(symbol: string): Promise<{ price: number; changePercent: number } | null> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return null;

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

async function fetchMarketNews(): Promise<Array<{ headline: string; summary: string; url: string }>> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return [];

    const response = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`);
    const data = await response.json();

    // Get top 2 most recent news
    return data.slice(0, 2).map((item: any) => ({
      headline: item.headline,
      summary: item.summary || '',
      url: item.url,
    }));
  } catch (error) {
    console.error('Error fetching market news:', error);
    return [];
  }
}

async function fetchRedditPosts(symbols: string[]): Promise<Array<{ title: string; score: number; url: string; symbol: string }>> {
  try {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) return [];

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

    if (!accessToken) return [];

    const posts: Array<{ title: string; score: number; url: string; symbol: string }> = [];

    // Search for posts about each symbol
    for (const symbol of symbols.slice(0, 3)) { // Limit to 3 symbols to avoid rate limits
      const searchResponse = await fetch(
        `https://oauth.reddit.com/r/wallstreetbets/search?q=${symbol}&restrict_sr=1&sort=hot&limit=1`,
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
        if (post.score > 100) { // Only include posts with significant engagement
          posts.push({
            title: post.title,
            score: post.score,
            url: `https://reddit.com${post.permalink}`,
            symbol,
          });
        }
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return posts;
  } catch (error) {
    console.error('Error fetching Reddit posts:', error);
    return [];
  }
}

async function checkAndNotifyUser(userId: string) {
  try {
    // Get user with settings and holdings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        notificationSettings: true,
        holdings: true,
      },
    });

    console.log(`User ${userId}: found=${!!user}, chatId=${user?.telegramChatId}, telegram=${user?.notificationSettings?.telegram}, holdings=${user?.holdings.length || 0}`);

    if (!user || !user.telegramChatId || !user.notificationSettings?.telegram) {
      console.log(`Skipping user ${userId}: missing requirements`);
      return;
    }

    if (user.holdings.length === 0) {
      console.log(`User ${userId} has no holdings, sending empty portfolio message`);
      const emptyMessage = '📊 *Your Portfolio Update*\n\nYou don\'t have any stocks in your portfolio yet.\nAdd some stocks to start tracking!\n\n🐇 WealthyRabbit';
      await sendTelegramMessage(user.telegramChatId, emptyMessage);
      return;
    }

    // Initialize user state if not exists
    if (!userStates.has(userId)) {
      userStates.set(userId, {
        userId,
        lastPrices: new Map(),
      });
    }

    const state = userStates.get(userId)!;
    const stocksToNotify: Array<{ symbol: string; price: number; changePercent: number; dayChangePercent: number; oldPrice?: number }> = [];

    // Check each holding and show ALL of them
    for (const holding of user.holdings) {
      const currentData = await fetchStockPrice(holding.symbol);
      if (!currentData) continue;

      const lastPrice = state.lastPrices.get(holding.symbol);

      if (lastPrice) {
        // Calculate change since last check (5 minutes ago)
        const priceChange = ((currentData.price - lastPrice.price) / lastPrice.price) * 100;

        // Always add to notify list (show all stocks every time)
        stocksToNotify.push({
          symbol: holding.symbol,
          price: currentData.price,
          changePercent: priceChange,
          dayChangePercent: currentData.changePercent, // Day's overall change
          oldPrice: lastPrice.price,
        });
      } else {
        // First time seeing this stock
        stocksToNotify.push({
          symbol: holding.symbol,
          price: currentData.price,
          changePercent: 0,
          dayChangePercent: currentData.changePercent,
        });
      }

      // Update stored price
      state.lastPrices.set(holding.symbol, {
        symbol: holding.symbol,
        price: currentData.price,
        changePercent: currentData.changePercent,
        timestamp: Date.now(),
      });
    }

    // Fetch additional market context
    const symbols = user.holdings.map(h => h.symbol);
    const [news, redditPosts] = await Promise.all([
      fetchMarketNews(),
      fetchRedditPosts(symbols),
    ]);

    // Build TLDR summary
    const gainers = stocksToNotify.filter(s => s.dayChangePercent >= 0);
    const losers = stocksToNotify.filter(s => s.dayChangePercent < 0);
    const bigMovers = stocksToNotify.filter(s => Math.abs(s.dayChangePercent) > 3);

    // Opening - friendly and contextual
    let opening = '';
    if (bigMovers.length > 0) {
      opening = 'Hey — some movement in your portfolio today.\n\n';
    } else if (gainers.length > losers.length) {
      opening = 'Quick catch-up on your portfolio.\n\n';
    } else if (losers.length > gainers.length) {
      opening = 'Heads up — bit of a pullback today.\n\n';
    } else {
      opening = 'Morning update on your holdings.\n\n';
    }

    let narrative = opening;

    // Gather context: news and Reddit posts
    const relevantNews = news.filter(item => {
      const headline = item.headline.toLowerCase();
      // Match stock symbols as whole words with word boundaries
      return symbols.some(symbol => {
        const pattern = new RegExp(`\\b${symbol.toLowerCase()}\\b`, 'i');
        return pattern.test(headline);
      });
    });

    // Create calm, friend-briefing-you descriptions
    const stockDescriptions = [];
    for (const stock of stocksToNotify) {
      const isGaining = stock.dayChangePercent >= 0;
      const changePercent = Math.abs(stock.dayChangePercent);

      let desc = `*${stock.symbol}*\n`;

      // Find relevant news or Reddit for this stock
      const redditPost = redditPosts.find(p => p.symbol === stock.symbol);
      const stockNews = relevantNews.filter(n => {
        const pattern = new RegExp(`\\b${stock.symbol.toLowerCase()}\\b`, 'i');
        return pattern.test(n.headline.toLowerCase());
      });

      // Prioritize news/Reddit context over price movements
      if (stockNews.length > 0) {
        const newsItem = stockNews[0];
        // Short headline + reason
        desc += `${newsItem.headline}.\n`;

        // Brief context
        if (newsItem.summary && newsItem.summary.length > 0) {
          const summary = newsItem.summary.length > 100
            ? newsItem.summary.substring(0, 100) + '...'
            : newsItem.summary;
          desc += `${summary}\n`;
        }

        // Sentiment snapshot
        if (isGaining) {
          desc += `Market's reacting positively — shares at $${stock.price.toFixed(2)}.`;
        } else {
          desc += `Bit of caution showing — trading at $${stock.price.toFixed(2)}.`;
        }
      } else if (redditPost) {
        // Extract sentiment from Reddit post title
        const title = redditPost.title.toLowerCase();
        const isBullish = title.includes('moon') || title.includes('buy') || title.includes('calls') ||
                          title.includes('rocket') || title.includes('squeeze') || title.includes('bullish');
        const isBearish = title.includes('puts') || title.includes('short') || title.includes('crash') ||
                          title.includes('bearish') || title.includes('dump');

        if (isBullish) {
          desc += `Buzz building on Reddit.\n"${redditPost.title}" — ${redditPost.score.toLocaleString()} upvotes.\nRetail crowd's spotting momentum. Trading at $${stock.price.toFixed(2)}.`;
        } else if (isBearish) {
          desc += `Reddit chatter turned cautious.\nSentiment's shifting negative — could mean some near-term pressure.\nCurrently at $${stock.price.toFixed(2)}.`;
        } else {
          desc += `Catching attention on Reddit.\n"${redditPost.title}" — ${redditPost.score.toLocaleString()} upvotes.\nEarly buzz, worth watching. At $${stock.price.toFixed(2)}.`;
        }
      } else {
        // No news context - describe movement calmly
        if (changePercent > 5) {
          desc += isGaining
            ? `Big move today — up ${changePercent.toFixed(1)}%.\nUsually means strong buying or news circulating quietly.\nShares at $${stock.price.toFixed(2)}.`
            : `Took a hit — down ${changePercent.toFixed(1)}%.\nCould be sector-wide or company-specific. Worth checking.\nAt $${stock.price.toFixed(2)}.`;
        } else if (changePercent > 2) {
          desc += isGaining
            ? `Solid day — up ${changePercent.toFixed(1)}%.\nSteady climb suggests genuine buying interest.\nTrading at $${stock.price.toFixed(2)}.`
            : `Pullback today — down ${changePercent.toFixed(1)}%.\nSome profit-taking or repositioning happening.\nAt $${stock.price.toFixed(2)}.`;
        } else if (changePercent > 0.5) {
          desc += isGaining
            ? `Edging higher — up ${changePercent.toFixed(1)}%.\nNothing dramatic, just quiet optimism.\nAt $${stock.price.toFixed(2)}.`
            : `Drifting lower — down ${changePercent.toFixed(1)}%.\nMild selling, nothing alarming.\nAt $${stock.price.toFixed(2)}.`;
        } else {
          desc += `Pretty quiet today.\nTrading flat around $${stock.price.toFixed(2)}.`;
        }
      }

      stockDescriptions.push(desc);
    }

    narrative += stockDescriptions.join('\n\n');

    narrative += '\n\n🐇 WealthyRabbit';

    const message = narrative;

    console.log(`Sending notification to user ${userId} with ${stocksToNotify.length} stocks`);
    console.log(`Message length: ${message.length} characters`);
    console.log(`Full message:\n${message}`);
    const result = await sendTelegramMessage(user.telegramChatId, message);
    console.log(`Notification sent: success=${result.success}, error=${result.error || 'none'}`);

  } catch (error) {
    console.error(`Error checking notifications for user ${userId}:`, error);
  }
}

async function runNotificationCheck() {
  try {
    // Get all users with Telegram enabled
    const users = await prisma.user.findMany({
      where: {
        telegramChatId: { not: null },
        notificationSettings: {
          telegram: true,
        },
      },
      select: { id: true },
    });

    console.log(`Running notification check for ${users.length} users`);

    // Check each user
    for (const user of users) {
      await checkAndNotifyUser(user.id);
    }
  } catch (error) {
    console.error('Error in notification check:', error);
  }
}

// Track the interval and state
let notificationInterval: NodeJS.Timeout | null = null;
let isShutdownHandlerRegistered = false;
let lastRunTime: Date | null = null;

/**
 * Stops the notification scheduler and cleans up resources.
 * Safe to call multiple times - won't error if already stopped.
 */
export function stopNotificationScheduler() {
  if (notificationInterval) {
    console.log('🛑 Stopping notification scheduler...');
    clearInterval(notificationInterval);
    notificationInterval = null;
    console.log('✅ Notification scheduler stopped cleanly');

    if (lastRunTime) {
      console.log(`   Last run was at: ${lastRunTime.toLocaleString()}`);
    }
  } else {
    console.log('ℹ️  Notification scheduler was not running');
  }
}

/**
 * Registers cleanup handlers to stop the scheduler when the app shuts down.
 * This ensures no background tasks keep running after deployment or restart.
 */
function registerShutdownHandlers() {
  if (isShutdownHandlerRegistered) {
    return; // Already registered, don't add duplicates
  }

  console.log('📋 Registering shutdown handlers for graceful cleanup');

  // Handle normal shutdown (Ctrl+C)
  process.on('SIGINT', () => {
    console.log('\n🔄 Received SIGINT (Ctrl+C) - shutting down gracefully...');
    stopNotificationScheduler();
    process.exit(0);
  });

  // Handle termination signal (deployment, Docker stop, etc.)
  process.on('SIGTERM', () => {
    console.log('\n🔄 Received SIGTERM - shutting down gracefully...');
    stopNotificationScheduler();
    process.exit(0);
  });

  // Handle uncaught errors - clean up before crashing
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    stopNotificationScheduler();
    process.exit(1);
  });

  isShutdownHandlerRegistered = true;
  console.log('✅ Shutdown handlers registered successfully');
}

/**
 * Starts the notification scheduler.
 * - Runs every 5 minutes
 * - Automatically registers shutdown handlers
 * - Safe to call multiple times (won't create duplicates)
 */
export function startNotificationScheduler() {
  // Safety check: prevent duplicate intervals
  if (notificationInterval) {
    console.log('⚠️  Notification scheduler already running - skipping start');
    console.log(`   Last run: ${lastRunTime ? lastRunTime.toLocaleString() : 'Never'}`);
    return;
  }

  console.log('🚀 Starting notification scheduler');
  console.log(`   Check interval: ${CHECK_INTERVAL / 1000 / 60} minutes`);
  console.log(`   First check in: 10 seconds`);

  // Register cleanup handlers on first start
  registerShutdownHandlers();

  // Run first check after 10 seconds (let server initialize)
  setTimeout(() => {
    console.log('⏰ Running initial notification check...');
    lastRunTime = new Date();
    runNotificationCheck();
  }, 10000);

  // Then run every 5 minutes
  notificationInterval = setInterval(() => {
    console.log(`⏰ Running scheduled notification check (${new Date().toLocaleString()})`);
    lastRunTime = new Date();
    runNotificationCheck();
  }, CHECK_INTERVAL);

  console.log('✅ Notification scheduler started successfully');
}
