import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

// POST /api/telegram/webhook - Receive updates from Telegram
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log the update for debugging
    console.log('Telegram webhook received:', JSON.stringify(body, null, 2));

    // Extract chat info
    if (body.message) {
      const chatId = body.message.chat.id.toString();
      const firstName = body.message.chat.first_name;
      const username = body.message.chat.username;
      const messageText = body.message.text;

      console.log('Chat ID:', chatId);
      console.log('From:', firstName, username ? `(@${username})` : '');
      console.log('Message:', messageText);

      // Handle /start command - link Telegram to WealthyRabbit account
      if (messageText?.startsWith('/start')) {
        // Extract verification code if provided (format: /start VERIFICATION_CODE)
        const parts = messageText.split(' ');
        const verificationCode = parts[1];

        if (verificationCode) {
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

            console.log(`Linked Chat ID ${chatId} to user ${user.id}`);
          } else {
            await sendTelegramMessage(
              chatId,
              `❌ *Invalid Code*\n\nThe verification code is invalid. Please copy the correct code from the Manage page in WealthyRabbit.`
            );
          }
        } else {
          // No verification code - send welcome message
          await sendTelegramMessage(
            chatId,
            `🐇 *Welcome to WealthyRabbit!*\n\nTo link your account:\n1. Open WealthyRabbit app\n2. Go to Manage page\n3. Enable Telegram notifications\n4. Copy your verification code\n5. Send: /start YOUR_CODE\n\nExample: /start abc123xyz`
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET /api/telegram/webhook - Health check
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' });
}
