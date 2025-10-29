import TelegramBot from 'node-telegram-bot-api';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

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
 * Send a Telegram message
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
