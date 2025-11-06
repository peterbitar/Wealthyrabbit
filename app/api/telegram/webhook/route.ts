import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to send Telegram message directly via HTTP API
async function sendTelegramMessage(chatId: string, message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('Bot token not configured');
    return { success: false };
  }

  try {
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
      console.log('✅ Message sent successfully to', chatId);
      return { success: true };
    } else {
      console.error('❌ Telegram API error:', data);
      return { success: false, error: data.description };
    }
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return { success: false, error };
  }
}

// POST /api/telegram/webhook - Receive updates from Telegram
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log the update for debugging
    console.log('🔔 Telegram webhook received:', JSON.stringify(body, null, 2));

    // Extract chat info
    if (body.message) {
      const chatId = body.message.chat.id.toString();
      const firstName = body.message.chat.first_name;
      const username = body.message.chat.username;
      const messageText = body.message.text;

      console.log('📱 Chat ID:', chatId);
      console.log('👤 From:', firstName, username ? `(@${username})` : '');
      console.log('💬 Message:', messageText);

      // Handle /start command - link Telegram to WealthyRabbit account
      if (messageText?.startsWith('/start')) {
        console.log('🎯 Processing /start command');

        // Extract verification code if provided (format: /start VERIFICATION_CODE)
        const parts = messageText.split(' ');
        const verificationCode = parts[1];

        if (verificationCode) {
          console.log('🔑 Verification code provided:', verificationCode);

          // Find user with this verification code
          const user = await prisma.user.findFirst({
            where: { id: verificationCode },
          });

          if (user) {
            // Update user's Telegram Chat ID
            await prisma.user.update({
              where: { id: user.id },
              data: { telegramChatId: chatId },
            });

            // Send confirmation
            await sendTelegramMessage(
              chatId,
              `✅ *Account Linked!*\n\nYour Telegram is now connected to WealthyRabbit.\n\nYou'll receive notifications about:\n📈 Stock price movements\n💼 Portfolio updates\n📰 Market news\n\n🐇 Happy investing!`
            );

            console.log(`✅ Linked Chat ID ${chatId} to user ${user.id}`);
          } else {
            console.log('❌ Invalid verification code');
            await sendTelegramMessage(
              chatId,
              `❌ *Invalid Code*\n\nThe verification code is invalid. Please copy the correct code from the Manage page in WealthyRabbit.`
            );
          }
        } else {
          // No verification code - send Chat ID
          console.log('📋 No verification code - sending Chat ID');
          const result = await sendTelegramMessage(
            chatId,
            `🐇 *Welcome to WealthyRabbit!*\n\n*Your Chat ID:*\n\`${chatId}\`\n\nTo connect:\n1. Copy your Chat ID above\n2. Go to the Manage page in WealthyRabbit app\n3. Enable Telegram notifications\n4. Paste your Chat ID in the input field\n\n*What You'll Get:*\n• 📊 Real-time price alerts\n• 📰 Breaking market news\n• 🎯 Daily portfolio summaries\n• 💬 Ask me anything about stocks!\n\n🐇 *Let's make some money!*`
          );
          console.log('📤 Send result:', result);
        }
      } else if (messageText && !messageText.startsWith('/')) {
        // Handle regular messages - check if asking for chat ID
        const lowerText = messageText.toLowerCase();
        if (lowerText.includes('chat id') || lowerText.includes('chatid') || lowerText === 'id') {
          console.log('📋 User asking for Chat ID');
          await sendTelegramMessage(
            chatId,
            `📋 *Your Chat ID:*\n\`${chatId}\`\n\nCopy the number above and paste it in the WealthyRabbit app under Manage > Telegram settings.`
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

// GET /api/telegram/webhook - Health check
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' });
}
