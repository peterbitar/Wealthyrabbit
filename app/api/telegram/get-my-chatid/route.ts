import { NextResponse } from 'next/server';

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    // Get recent updates to find the user's chat ID
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getUpdates?limit=1&offset=-1`
    );
    const data = await response.json();

    // Note: This will fail when webhook is active (which is expected)
    // We'll return a friendly message
    if (!data.ok) {
      return NextResponse.json({
        error: 'Webhook mode active',
        message: 'Send /start to @WealthyRabbit_bot to get your Chat ID',
        instructions: [
          '1. Open Telegram and search for @WealthyRabbit_bot',
          '2. Send /start',
          '3. Copy the Chat ID from the bot\'s reply',
          '4. Paste it in the Manage page'
        ]
      }, { status: 400 });
    }

    if (data.result && data.result.length > 0) {
      const lastMessage = data.result[0].message;
      if (lastMessage && lastMessage.chat) {
        return NextResponse.json({
          success: true,
          chatId: lastMessage.chat.id.toString(),
          from: {
            firstName: lastMessage.chat.first_name,
            username: lastMessage.chat.username,
          }
        });
      }
    }

    return NextResponse.json({
      error: 'No messages found',
      message: 'Send a message to @WealthyRabbit_bot first'
    }, { status: 404 });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
