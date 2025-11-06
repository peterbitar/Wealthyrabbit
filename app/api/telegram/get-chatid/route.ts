import { NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({
        instructions: 'To get your Chat ID, send any message to @WealthyRabbit_bot on Telegram, then check the message. The bot will tell you your Chat ID.',
        alternative: 'Or visit https://t.me/userinfobot and it will send you your Telegram ID.'
      });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: 'Telegram bot not configured' },
        { status: 500 }
      );
    }

    const bot = new TelegramBot(botToken, { polling: false });

    // Get bot updates to find user's chat ID
    const updates = await bot.getUpdates({ limit: 100 });

    // Find the user's chat ID from recent messages
    const userUpdate = updates.find((update: any) =>
      update.message?.from?.username === username
    );

    if (userUpdate) {
      const chatId = userUpdate.message.chat.id;
      return NextResponse.json({
        success: true,
        chatId: chatId.toString(),
        username: username,
        message: `Your Chat ID is: ${chatId}. Copy this and paste it in the Manage page.`
      });
    }

    return NextResponse.json({
      error: 'Could not find your Chat ID. Please send a message to @WealthyRabbit_bot first.',
      hint: 'Send any message like "hello" to the bot, then try again.'
    });
  } catch (error: any) {
    console.error('Error getting chat ID:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
