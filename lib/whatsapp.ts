import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox number

let client: twilio.Twilio | null = null;

// Initialize Twilio client only if credentials are available
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
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
 * Send a WhatsApp message using Twilio
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!client) {
    console.error('Twilio client not initialized. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    return {
      success: false,
      error: 'WhatsApp service not configured',
    };
  }

  try {
    // Ensure phone number has whatsapp: prefix
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    await client.messages.create({
      body: message,
      from: whatsappNumber,
      to: formattedTo,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
    };
  }
}

/**
 * Format a stock alert message for WhatsApp
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
 * Format a portfolio update message for WhatsApp
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
 * Format a daily digest message for WhatsApp
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
