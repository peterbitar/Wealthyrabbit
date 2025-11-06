import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json({ error: 'chatId parameter required' }, { status: 400 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    const message = `🐇 *Test Message*\n\n*Your Chat ID:*\n\`${chatId}\`\n\nThis is a test message from WealthyRabbit!\n\n✅ The webhook is working correctly.`;

    // Send message directly via Telegram HTTP API
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: 'Message sent successfully',
        telegram_response: data,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data.description,
        telegram_response: data,
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
