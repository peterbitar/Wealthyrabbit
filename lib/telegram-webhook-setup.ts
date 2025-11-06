import { setWebhook } from './telegram-bot';

const WEBHOOK_URL = 'https://wealthyrabbit.vercel.app/api/telegram/webhook';

export async function setupTelegramWebhook() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('⚠️  Telegram bot token not configured, skipping webhook setup');
    return;
  }

  console.log('🔧 Initializing Telegram webhook mode...');
  await setWebhook(WEBHOOK_URL);
}
