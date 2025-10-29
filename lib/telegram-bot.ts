import TelegramBot from 'node-telegram-bot-api';
import { prisma } from './prisma';
import OpenAI from 'openai';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let bot: TelegramBot | null = null;
let isPolling = false;

// Helper function to fetch stock price
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

// Helper function to fetch market news
async function fetchMarketNews(): Promise<Array<{ headline: string; summary: string; url: string }>> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return [];

    const response = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`);
    const data = await response.json();

    return data.slice(0, 5).map((item: any) => ({
      headline: item.headline,
      summary: item.summary || '',
      url: item.url,
    }));
  } catch (error) {
    console.error('Error fetching market news:', error);
    return [];
  }
}

// Helper function to fetch Reddit posts
async function fetchRedditPosts(symbols: string[]): Promise<Array<{ title: string; score: number; url: string; symbol: string }>> {
  try {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) return [];

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

    for (const symbol of symbols.slice(0, 5)) {
      const searchResponse = await fetch(
        `https://oauth.reddit.com/r/wallstreetbets/search?q=${symbol}&restrict_sr=1&sort=hot&limit=2`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'WealthyRabbit:v1.0.0',
          },
        }
      );

      const searchData = await searchResponse.json();

      if (searchData.data?.children?.length > 0) {
        for (const child of searchData.data.children) {
          const post = child.data;
          if (post.score > 50) {
            posts.push({
              title: post.title,
              score: post.score,
              url: `https://reddit.com${post.permalink}`,
              symbol,
            });
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return posts;
  } catch (error) {
    console.error('Error fetching Reddit posts:', error);
    return [];
  }
}

// Handle conversational messages
async function handleConversation(chatId: string, message: string) {
  try {
    // Find user by chat ID
    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
      include: {
        holdings: true,
      },
    });

    if (!user) {
      await bot?.sendMessage(
        chatId,
        "Hey, I don't have your account linked yet. Send /start with your verification code to get started."
      );
      return;
    }

    // Send typing indicator
    await bot?.sendChatAction(chatId, 'typing');

    // Fetch market context
    const symbols = user.holdings.map(h => h.symbol);
    const [news, redditPosts] = await Promise.all([
      fetchMarketNews(),
      fetchRedditPosts(symbols),
    ]);

    // Fetch current prices for all holdings
    const portfolioData = await Promise.all(
      user.holdings.map(async (holding) => {
        const priceData = await fetchStockPrice(holding.symbol);
        return {
          symbol: holding.symbol,
          shares: holding.shares,
          price: priceData?.price || 0,
          changePercent: priceData?.changePercent || 0,
        };
      })
    );

    // Build context for LLM
    const portfolioContext = portfolioData.map(stock =>
      `${stock.symbol}: $${stock.price.toFixed(2)} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}% today), ${stock.shares} shares`
    ).join('\n');

    const newsContext = news.slice(0, 5).map(n =>
      `- ${n.headline}${n.summary ? ': ' + n.summary.substring(0, 200) : ''}`
    ).join('\n');

    const redditContext = redditPosts.map(p =>
      `- ${p.symbol}: "${p.title}" (${p.score} upvotes)`
    ).join('\n');

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a calm, knowledgeable market advisor helping a user understand their portfolio and the markets. You speak like a well-read friend who spent the morning on Bloomberg, Reddit, and Twitter. You're informed, gentle, and human. Never panic, never shout. You know what's important and skip what's not.

Your tone:
- Conversational and friendly ("Hey", "Looks like", "Worth noting")
- Confident but not arrogant
- Brief but complete - 2-3 sentences max unless they ask for more detail
- Focus on WHY things matter, not just WHAT happened

Current portfolio:
${portfolioContext}

Recent market news:
${newsContext}

Reddit buzz (r/wallstreetbets):
${redditContext}

Answer the user's question using this context. Keep it conversational and calm.`
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content ||
      "Sorry, I couldn't process that right now. Mind trying again?";

    await bot?.sendMessage(chatId, response);

  } catch (error) {
    console.error('Error handling conversation:', error);
    await bot?.sendMessage(
      chatId,
      "Hmm, ran into a hiccup there. Can you try asking again?"
    );
  }
}

export function startTelegramBot() {
  if (!botToken) {
    console.log('TELEGRAM_BOT_TOKEN not set, skipping bot initialization');
    return;
  }

  if (isPolling) {
    console.log('Telegram bot already running');
    return;
  }

  try {
    bot = new TelegramBot(botToken, {
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10
        }
      }
    });
    isPolling = true;

    console.log('Telegram bot started with polling');

    // Handle /start command
    bot.onText(/\/start(.*)/, async (msg, match) => {
      const chatId = msg.chat.id.toString();
      const verificationCode = match?.[1]?.trim();

      console.log(`Received /start from ${chatId}, code: ${verificationCode || 'none'}`);

      if (verificationCode) {
        try {
          // Find user with this verification code (using user ID)
          const user = await prisma.user.findFirst({
            where: { id: verificationCode },
          });

          if (user) {
            // Update user's Telegram Chat ID
            await prisma.user.update({
              where: { id: user.id },
              data: { telegramChatId: chatId },
            });

            // Send confirmation
            await bot?.sendMessage(
              chatId,
              `✅ *Account Linked!*\n\nYour Telegram is now connected to WealthyRabbit.\n\nYou'll receive notifications about:\n📈 Stock price movements\n💼 Portfolio updates\n📰 Market news\n\n🐇 Happy investing!`,
              { parse_mode: 'Markdown' }
            );

            console.log(`Linked Chat ID ${chatId} to user ${user.id}`);
          } else {
            await bot?.sendMessage(
              chatId,
              `❌ *Invalid Code*\n\nThe verification code is invalid. Please copy the correct code from the Manage page in WealthyRabbit.`,
              { parse_mode: 'Markdown' }
            );
          }
        } catch (error) {
          console.error('Error linking account:', error);
          await bot?.sendMessage(
            chatId,
            `❌ *Error*\n\nFailed to link your account. Please try again later.`,
            { parse_mode: 'Markdown' }
          );
        }
      } else {
        // No verification code - send welcome message
        await bot?.sendMessage(
          chatId,
          `🐇 *Welcome to WealthyRabbit!*\n\nTo link your account:\n1. Open WealthyRabbit app\n2. Go to Manage page\n3. Enable Telegram notifications\n4. Copy your verification code\n5. Send: /start YOUR_CODE\n\nExample: /start abc123xyz`,
          { parse_mode: 'Markdown' }
        );
      }
    });

    // Handle all text messages (not commands)
    bot.on('message', async (msg) => {
      // Skip if it's a command
      if (msg.text?.startsWith('/')) return;

      // Skip if no text
      if (!msg.text) return;

      const chatId = msg.chat.id.toString();
      console.log(`Received message from ${chatId}: ${msg.text}`);

      await handleConversation(chatId, msg.text);
    });

    // Handle errors
    bot.on('polling_error', (error) => {
      console.error('Telegram polling error:', error);
    });

  } catch (error) {
    console.error('Failed to start Telegram bot:', error);
    isPolling = false;
  }
}

export function stopTelegramBot() {
  if (bot && isPolling) {
    bot.stopPolling();
    isPolling = false;
    console.log('Telegram bot stopped');
  }
}

// ============================================================================
// WEBHOOK MANAGEMENT
// ============================================================================

let isShutdownHandlerRegistered = false;

/**
 * Gets the current webhook info from Telegram.
 * Returns null if no webhook is set or on error.
 */
async function getWebhookInfo(): Promise<{ url: string; pending_update_count: number } | null> {
  if (!botToken) return null;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );
    const data = await response.json();

    if (data.ok && data.result) {
      return {
        url: data.result.url || '',
        pending_update_count: data.result.pending_update_count || 0,
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting webhook info:', error);
    return null;
  }
}

/**
 * Deletes the current webhook.
 * This stops Telegram from sending updates to your old deployment.
 */
async function deleteWebhook(): Promise<boolean> {
  if (!botToken) {
    console.log('⚠️  No bot token - skipping webhook deletion');
    return false;
  }

  try {
    console.log('🧹 Deleting Telegram webhook...');

    // First check if webhook exists
    const info = await getWebhookInfo();
    if (!info || !info.url) {
      console.log('ℹ️  No webhook is set - nothing to delete');
      return true;
    }

    console.log(`   Current webhook: ${info.url}`);
    if (info.pending_update_count > 0) {
      console.log(`   Pending updates: ${info.pending_update_count}`);
    }

    // Delete the webhook
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/deleteWebhook`
    );
    const data = await response.json();

    if (data.ok) {
      console.log('✅ Webhook deleted successfully');
      console.log('   Old messages will not be re-sent to new deployment');
      return true;
    } else {
      console.error('❌ Failed to delete webhook:', data.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting webhook:', error);
    return false;
  }
}

/**
 * Sets up a webhook for receiving Telegram updates.
 * Checks if webhook already exists to avoid duplicates.
 *
 * @param webhookUrl - Your public webhook URL (e.g., https://yourapp.com/api/telegram/webhook)
 */
export async function setWebhook(webhookUrl: string): Promise<boolean> {
  if (!botToken) {
    console.log('❌ No TELEGRAM_BOT_TOKEN - cannot set webhook');
    return false;
  }

  if (!webhookUrl) {
    console.log('❌ No webhook URL provided');
    return false;
  }

  try {
    console.log('🔧 Setting up Telegram webhook...');
    console.log(`   Target URL: ${webhookUrl}`);

    // Check if webhook already exists
    const existingInfo = await getWebhookInfo();
    if (existingInfo && existingInfo.url === webhookUrl) {
      console.log('ℹ️  Webhook already set to this URL - skipping');
      console.log(`   Pending updates: ${existingInfo.pending_update_count}`);
      return true;
    }

    if (existingInfo && existingInfo.url) {
      console.log(`⚠️  Existing webhook found: ${existingInfo.url}`);
      console.log('   Replacing with new URL...');
    }

    // Set the new webhook
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          drop_pending_updates: true, // Don't send old messages from previous deployment
        }),
      }
    );

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Webhook set successfully');
      console.log('   Telegram will now send updates to:', webhookUrl);
      console.log('   Old pending updates have been dropped');

      // Register cleanup on first webhook setup
      registerWebhookCleanupHandlers();

      return true;
    } else {
      console.error('❌ Failed to set webhook:', data.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
    return false;
  }
}

/**
 * Registers cleanup handlers to delete webhook on shutdown.
 * Prevents old deployments from receiving messages.
 */
function registerWebhookCleanupHandlers() {
  if (isShutdownHandlerRegistered) {
    return; // Already registered
  }

  console.log('📋 Registering webhook cleanup handlers');

  // Handle normal shutdown (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('\n🔄 Received SIGINT - cleaning up webhook...');
    await deleteWebhook();
    stopTelegramBot();
    process.exit(0);
  });

  // Handle termination signal (deployment, Docker stop, etc.)
  process.on('SIGTERM', async () => {
    console.log('\n🔄 Received SIGTERM - cleaning up webhook...');
    await deleteWebhook();
    stopTelegramBot();
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught exception:', error);
    await deleteWebhook();
    stopTelegramBot();
    process.exit(1);
  });

  isShutdownHandlerRegistered = true;
  console.log('✅ Webhook cleanup handlers registered');
}

/**
 * Utility function to manually clean up webhook.
 * Useful for switching between webhook and polling modes.
 */
export async function cleanupWebhook(): Promise<void> {
  console.log('🧹 Manual webhook cleanup requested');
  await deleteWebhook();
}
