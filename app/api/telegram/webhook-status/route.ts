import { NextResponse } from 'next/server';

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );
    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({
        success: true,
        webhookInfo: {
          url: data.result.url || '(not set)',
          has_custom_certificate: data.result.has_custom_certificate,
          pending_update_count: data.result.pending_update_count,
          last_error_date: data.result.last_error_date,
          last_error_message: data.result.last_error_message,
          max_connections: data.result.max_connections,
          allowed_updates: data.result.allowed_updates,
        },
      });
    }

    return NextResponse.json({ success: false, error: data.description });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
