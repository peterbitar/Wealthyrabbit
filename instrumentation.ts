export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { setupTelegramWebhook } = await import('./lib/telegram-webhook-setup');
    const { startNotificationScheduler } = await import('./lib/notification-scheduler');

    setupTelegramWebhook();
    startNotificationScheduler();
  }
}
