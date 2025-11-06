import { NextResponse } from 'next/server';

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    console.log('🧹 Force webhook setup - deleting any existing config...');

    // Step 1: Delete webhook (stops old deployments from receiving updates)
    const deleteResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=true`
    );
    const deleteData = await deleteResponse.json();
    console.log('Delete result:', deleteData);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Set new webhook
    const webhookUrl = 'https://wealthyrabbit.vercel.app/api/telegram/webhook';
    const setResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          drop_pending_updates: true,
          max_connections: 40,
        }),
      }
    );
    const setData = await setResponse.json();
    console.log('Set webhook result:', setData);

    // Step 3: Verify
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );
    const infoData = await infoResponse.json();

    return NextResponse.json({
      success: setData.ok,
      steps: {
        delete: deleteData,
        set: setData,
        verify: infoData.result,
      },
      message: setData.ok
        ? '✅ Webhook forcefully reset - old deployments should stop responding'
        : '❌ Failed to set webhook',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
