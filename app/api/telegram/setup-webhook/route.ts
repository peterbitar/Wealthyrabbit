import { NextResponse } from 'next/server';

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = 'https://wealthyrabbit.vercel.app/api/telegram/webhook';

  if (!botToken) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    // Set the webhook
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          drop_pending_updates: true,
        }),
      }
    );

    const data = await response.json();

    if (data.ok) {
      // Verify it was set
      const infoResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getWebhookInfo`
      );
      const info = await infoResponse.json();

      return NextResponse.json({
        success: true,
        message: 'Webhook set successfully',
        webhook_url: webhookUrl,
        webhook_info: info.result,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data.description,
        response: data,
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
