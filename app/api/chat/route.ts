import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { generateAndStoreVoiceNote } from '@/lib/voice-notes';

/**
 * POST /api/chat
 * Context-aware chat with WealthyRabbit AI
 * Knows about user's holdings, recent notifications, news, and Reddit sentiment
 */
export async function POST(request: NextRequest) {
  try {
    const {
      message,
      conversationHistory = [],
      userId = 'cmh503gjd00008okpn9ic7cia',
      requestVoiceNote = false // User explicitly requested voice note
    } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Fetch user's portfolio context
    const holdings = await prisma.holding.findMany({
      where: { userId },
      select: { symbol: true, name: true, shares: true, avgPrice: true },
    });

    // Fetch recent notifications (last 10) to provide context
    const recentNotifications = await prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { message: true, createdAt: true },
    });

    // Fetch stock prices for holdings
    const symbols = holdings.map(h => h.symbol);
    const stockPrices = await prisma.stockPrice.findMany({
      where: { symbol: { in: symbols } },
      select: {
        symbol: true,
        currentPrice: true,
        dayChange: true,
        dayChangePercent: true
      },
    });

    // Build context summary
    const portfolioContext = holdings.length > 0
      ? `USER'S PORTFOLIO:
${holdings.map(h => {
  const price = stockPrices.find(p => p.symbol === h.symbol);
  const priceInfo = price
    ? ` - Current: $${price.currentPrice.toFixed(2)} (${price.dayChangePercent > 0 ? '+' : ''}${price.dayChangePercent.toFixed(2)}% today)`
    : '';
  return `- ${h.symbol} (${h.name}): ${h.shares} shares @ $${h.avgPrice.toFixed(2)}${priceInfo}`;
}).join('\n')}`
      : 'User has no holdings yet.';

    const notificationContext = recentNotifications.length > 0
      ? `\n\nRECENT NOTIFICATIONS SENT TO USER:
${recentNotifications.slice(0, 3).map((n, i) =>
  `${i + 1}. ${n.message.substring(0, 200)}${n.message.length > 200 ? '...' : ''}`
).join('\n\n')}`
      : '';

    const openai = new OpenAI({ apiKey });

    // Enhanced system prompt with portfolio context
    const systemPrompt = `You are WealthyRabbit 🐇, a friendly and knowledgeable AI assistant who helps people understand markets and investing.

Your personality:
- Casual and conversational, like texting a friend who knows markets
- Quick to the point, no fluff
- You explain complex financial concepts in simple, relatable terms
- You use analogies and real-world examples
- You're honest about uncertainty and risks
- You NEVER give specific financial advice like "buy this" or "sell that"
- Instead, you explain what's happening and help people make informed decisions
- You CAN generate voice notes - your responses are automatically converted to audio for longer explanations

DATA ACCESS & CAPABILITIES:
- You have access to real-time market data, news, and Reddit sentiment through our APIs
- When asked about current events, news, or market movements, you CAN provide that information
- Our system fetches live data from financial news sources, Reddit, and market APIs
- You are NOT limited to your training data - you can discuss today's market events
- You can discuss trending stocks, market analysis, sector movements, and general market sentiment
- You're versatile - comfortable discussing both broad market topics AND specific portfolio questions

CONTEXT AWARENESS:
- You have access to the user's portfolio and recent notifications (shown below)
- When they explicitly ask about "my holdings" or "my stocks", refer to their actual portfolio
- When they ask about something you sent them, refer to the recent notifications
- However, don't force portfolio connections - if they ask about trending stocks or market analysis, discuss those topics broadly
- Only connect to their holdings when it's relevant or they specifically ask

${portfolioContext}${notificationContext}

When answering:
- Keep responses concise (2-4 paragraphs max)
- Use simple language, avoid jargon unless you explain it
- Be helpful and educational
- For general market questions (trending stocks, market analysis, sector moves), answer broadly without forcing portfolio connections
- For specific portfolio questions ("my stocks", "my TSLA"), reference their actual holdings above
- If they ask about notifications/updates you sent, reference the recent notifications above
- Focus on helping users understand, not telling them what to do
- End naturally, no need for sign-offs or asking if they have more questions

Remember: You're a versatile market assistant. Discuss trending stocks, market analysis, and broad market topics confidently. Only focus on their portfolio when they specifically ask about their holdings. You're explaining markets, not giving financial advice.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as any,
      max_tokens: 500,
      temperature: 0.8,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I had trouble processing that. Can you try rephrasing?';

    // Determine if we should generate a voice note
    // Generate voice note if:
    // 1. User explicitly requested it, OR
    // 2. Response is long (> 300 characters / ~50 words)
    const shouldGenerateVoiceNote = requestVoiceNote || reply.length > 300;

    let voiceNoteUrl = null;
    if (shouldGenerateVoiceNote) {
      try {
        console.log(`🎤 Generating voice note for chat response (length: ${reply.length} chars, requested: ${requestVoiceNote})`);
        voiceNoteUrl = await generateAndStoreVoiceNote(reply);
        console.log(`✅ Voice note generated: ${voiceNoteUrl}`);
      } catch (error) {
        console.error('Failed to generate voice note for chat:', error);
        // Continue without voice note if generation fails
      }
    }

    return NextResponse.json({
      message: reply,
      voiceNote: voiceNoteUrl,
      ok: true,
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
