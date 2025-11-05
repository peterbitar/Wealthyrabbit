import TelegramBot from 'node-telegram-bot-api';
import { lastEventContext } from './telegram-bot';
import OpenAI from 'openai';
import { Buffer } from 'buffer';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let bot: TelegramBot | null = null;

// Initialize Telegram bot only if token is available
if (botToken) {
  bot = new TelegramBot(botToken, { polling: false });
}

export interface StockAlert {
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  alert: string;
}

export interface PortfolioUpdate {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  topGainer?: StockAlert;
  topLoser?: StockAlert;
}

/**
 * Send a Telegram message (instant, no delays)
 */
export async function sendTelegramMessage(
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!bot) {
    console.error('Telegram bot not initialized. Please set TELEGRAM_BOT_TOKEN in .env');
    return {
      success: false,
      error: 'Telegram service not configured',
    };
  }

  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
    });

    // Extract stock symbol from message (format: *SYMBOL* ...)
    const symbolMatch = message.match(/\*([A-Z]+)\*/);
    if (symbolMatch && symbolMatch[1]) {
      const symbol = symbolMatch[1];
      lastEventContext.set(chatId, {
        symbol,
        timestamp: Date.now(),
      });
      console.log(`📝 Stored event context for ${chatId}: ${symbol}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending Telegram message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send Telegram message',
    };
  }
}

/**
 * Send a Telegram message paragraph by paragraph with human-like delays
 * Simulates natural typing speed for a more conversational feel
 */
export async function sendTelegramMessageWithDelay(
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!bot) {
    console.error('Telegram bot not initialized. Please set TELEGRAM_BOT_TOKEN in .env');
    return {
      success: false,
      error: 'Telegram service not configured',
    };
  }

  try {
    // Split message into paragraphs (separated by double newlines)
    const paragraphs = message.split('\n\n').filter(p => p.trim().length > 0);

    console.log(`📨 Sending ${paragraphs.length} paragraphs with delays to ${chatId}`);

    // Send first paragraph immediately
    if (paragraphs.length > 0) {
      await bot.sendMessage(chatId, paragraphs[0].trim(), {
        parse_mode: 'Markdown',
      });
      console.log(`   ✓ Sent paragraph 1/${paragraphs.length}`);
    }

    // Send remaining paragraphs with delays
    for (let i = 1; i < paragraphs.length; i++) {
      // Calculate delay based on previous paragraph length (simulate reading/typing time)
      const prevParagraphLength = paragraphs[i - 1].length;
      // Base delay: 1.5-2.5 seconds + reading time (50ms per character)
      const baseDelay = 1500 + Math.random() * 1000;
      const readingDelay = Math.min(prevParagraphLength * 50, 3000); // Max 3 seconds reading time
      const totalDelay = baseDelay + readingDelay;

      console.log(`   ⏱️  Waiting ${(totalDelay / 1000).toFixed(1)}s before paragraph ${i + 1}...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));

      // Show typing indicator
      await bot.sendChatAction(chatId, 'typing');

      // Wait a bit to show typing
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

      // Send paragraph
      await bot.sendMessage(chatId, paragraphs[i].trim(), {
        parse_mode: 'Markdown',
      });
      console.log(`   ✓ Sent paragraph ${i + 1}/${paragraphs.length}`);
    }

    // Extract and store stock symbol from message (for follow-up context)
    const symbolMatch = message.match(/\*([A-Z]+)\*/);
    if (symbolMatch && symbolMatch[1]) {
      const symbol = symbolMatch[1];
      lastEventContext.set(chatId, {
        symbol,
        timestamp: Date.now(),
      });
      console.log(`📝 Stored event context for ${chatId}: ${symbol}`);
    }

    console.log(`✅ Completed sending all ${paragraphs.length} paragraphs`);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending Telegram message with delay:', error);
    return {
      success: false,
      error: error.message || 'Failed to send Telegram message',
    };
  }
}

/**
 * Generate voice audio from text using OpenAI Text-to-Speech
 * @param text - The text to convert to speech
 * @returns Buffer containing the audio data (OGG format for Telegram)
 */
export async function generateVoiceNote(text: string): Promise<Buffer> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`🎤 Generating voice note (${text.length} characters)...`);

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      response_format: 'opus', // Telegram supports OGG/Opus format
    });

    // Convert the response to a buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`✅ Voice note generated (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    console.error('Error generating voice note:', error);
    throw error;
  }
}

/**
 * Send a voice note to Telegram
 * @param chatId - The Telegram chat ID
 * @param voiceBuffer - The audio buffer (OGG format)
 */
export async function sendVoiceNote(
  chatId: string,
  voiceBuffer: Buffer
): Promise<{ success: boolean; error?: string }> {
  if (!bot) {
    console.error('Telegram bot not initialized. Please set TELEGRAM_BOT_TOKEN in .env');
    return {
      success: false,
      error: 'Telegram service not configured',
    };
  }

  try {
    console.log(`🎵 Sending voice note to ${chatId} (${voiceBuffer.length} bytes)...`);

    await bot.sendVoice(chatId, voiceBuffer, {
      filename: 'voice.ogg',
    } as any);

    console.log(`✅ Voice note sent successfully`);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending voice note:', error);
    return {
      success: false,
      error: error.message || 'Failed to send voice note',
    };
  }
}

/**
 * Send a notification with text teaser and voice notes
 * @param chatId - The Telegram chat ID
 * @param teaser - The text teaser message
 * @param voiceNoteScripts - Array of voice note scripts to convert to audio
 */
export async function sendNotificationWithVoiceNotes(
  chatId: string,
  teaser: string,
  voiceNoteScripts: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📢 Sending notification with ${voiceNoteScripts.length} voice note(s)`);

    // Send the text teaser first
    const teaserResult = await sendTelegramMessage(chatId, teaser);
    if (!teaserResult.success) {
      return teaserResult;
    }

    // Wait a moment before sending voice notes
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate and send each voice note
    for (let i = 0; i < voiceNoteScripts.length; i++) {
      const script = voiceNoteScripts[i];

      console.log(`🎤 Processing voice note ${i + 1}/${voiceNoteScripts.length}`);

      // Show typing indicator
      if (bot) {
        await bot.sendChatAction(chatId, 'record_voice');
      }

      // Generate the voice note
      const voiceBuffer = await generateVoiceNote(script);

      // Send it
      const voiceResult = await sendVoiceNote(chatId, voiceBuffer);
      if (!voiceResult.success) {
        console.error(`Failed to send voice note ${i + 1}:`, voiceResult.error);
        // Continue with remaining voice notes even if one fails
      }

      // Wait between voice notes
      if (i < voiceNoteScripts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ Notification with voice notes sent successfully`);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending notification with voice notes:', error);
    return {
      success: false,
      error: error.message || 'Failed to send notification with voice notes',
    };
  }
}

/**
 * Format a stock alert message for Telegram
 */
export function formatStockAlert(alert: StockAlert): string {
  const emoji = alert.changePercent >= 0 ? '📈' : '📉';
  const sign = alert.changePercent >= 0 ? '+' : '';

  return `${emoji} *${alert.symbol}* (${alert.name})
Price: $${alert.currentPrice.toFixed(2)}
Change: ${sign}${alert.changePercent.toFixed(2)}%

${alert.alert}`;
}

/**
 * Format a portfolio update message for Telegram
 */
export function formatPortfolioUpdate(update: PortfolioUpdate): string {
  const emoji = update.dayChangePercent >= 0 ? '📈' : '📉';
  const sign = update.dayChangePercent >= 0 ? '+' : '';

  let message = `${emoji} *Portfolio Update*

Total Value: $${update.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Today: ${sign}$${Math.abs(update.dayChange).toFixed(2)} (${sign}${update.dayChangePercent.toFixed(2)}%)`;

  if (update.topGainer) {
    message += `\n\n🏆 Top Gainer: ${update.topGainer.symbol} +${update.topGainer.changePercent.toFixed(2)}%`;
  }

  if (update.topLoser) {
    message += `\n\n⚠️ Top Loser: ${update.topLoser.symbol} ${update.topLoser.changePercent.toFixed(2)}%`;
  }

  message += '\n\n🐇 WealthyRabbit';

  return message;
}

/**
 * Format a daily digest message for Telegram
 */
export function formatDailyDigest(data: {
  portfolioValue: number;
  dayChange: number;
  dayChangePercent: number;
  alerts: StockAlert[];
}): string {
  const emoji = data.dayChangePercent >= 0 ? '🌅' : '🌙';
  const sign = data.dayChangePercent >= 0 ? '+' : '';

  let message = `${emoji} *Daily Market Digest*

Portfolio: $${data.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Today: ${sign}$${Math.abs(data.dayChange).toFixed(2)} (${sign}${data.dayChangePercent.toFixed(2)}%)`;

  if (data.alerts.length > 0) {
    message += '\n\n*Notable Moves:*';
    data.alerts.forEach(alert => {
      const alertEmoji = alert.changePercent >= 0 ? '📈' : '📉';
      const alertSign = alert.changePercent >= 0 ? '+' : '';
      message += `\n${alertEmoji} ${alert.symbol}: ${alertSign}${alert.changePercent.toFixed(2)}%`;
    });
  }

  message += '\n\n🐇 WealthyRabbit';

  return message;
}
