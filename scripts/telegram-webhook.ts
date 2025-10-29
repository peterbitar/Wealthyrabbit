/**
 * Telegram Webhook Management Utility
 *
 * Provides functions to manage Telegram bot webhooks:
 * - Get current webhook info
 * - Delete existing webhook
 * - Set new webhook URL
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

/**
 * Get information about the current webhook
 */
export async function getWebhookInfo() {
  try {
    const response = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await response.json();

    if (data.ok) {
      console.log('✅ Webhook Info:');
      console.log(JSON.stringify(data.result, null, 2));
      return data.result;
    } else {
      console.error('❌ Failed to get webhook info:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching webhook info:', error);
    return null;
  }
}

/**
 * Delete the current webhook
 */
export async function deleteWebhook() {
  try {
    const response = await fetch(`${TELEGRAM_API}/deleteWebhook`, {
      method: 'POST',
    });
    const data = await response.json();

    if (data.ok) {
      console.log('✅ Webhook deleted successfully');
      return true;
    } else {
      console.error('❌ Failed to delete webhook:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting webhook:', error);
    return false;
  }
}

/**
 * Set a new webhook URL
 */
export async function setWebhook(url: string) {
  if (!url || !url.startsWith('https://')) {
    console.error('❌ Webhook URL must start with https://');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();

    if (data.ok) {
      console.log(`✅ Webhook set successfully to: ${url}`);
      return true;
    } else {
      console.error('❌ Failed to set webhook:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
    return false;
  }
}

/**
 * CLI runner
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'info':
      await getWebhookInfo();
      break;

    case 'delete':
      await deleteWebhook();
      break;

    case 'set':
      const url = process.argv[3];
      if (!url) {
        console.error('❌ Usage: pnpm telegram:set-webhook <url>');
        process.exit(1);
      }
      await setWebhook(url);
      break;

    default:
      console.log('Telegram Webhook Management\n');
      console.log('Usage:');
      console.log('  pnpm telegram:webhook-info     - Get current webhook info');
      console.log('  pnpm telegram:delete-webhook   - Delete webhook');
      console.log('  pnpm telegram:set-webhook <url> - Set new webhook URL');
      break;
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
