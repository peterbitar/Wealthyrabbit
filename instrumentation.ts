export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 WealthyRabbit starting up...');

    const { setupTelegramWebhook } = await import('./lib/telegram-webhook-setup');
    const { startNotificationScheduler } = await import('./lib/notification-scheduler');

    console.log('📡 Setting up Telegram webhook...');
    await setupTelegramWebhook();

    console.log('⏰ Starting notification scheduler...');
    startNotificationScheduler();

    console.log('✅ WealthyRabbit initialized');
  }
}
