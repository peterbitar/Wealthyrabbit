import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * POST /api/chat
 * Chat with the WealthyRabbit AI assistant
 */
export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

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

    const openai = new OpenAI({ apiKey });

    // System prompt for the rabbit personality
    const systemPrompt = `You are WealthyRabbit 🐇, a friendly and knowledgeable AI assistant who helps people understand markets and investing.

Your personality:
- Casual and conversational, like texting a friend who knows markets
- Quick to the point, no fluff
- You explain complex financial concepts in simple, relatable terms
- You use analogies and real-world examples
- You're honest about uncertainty and risks
- You NEVER give specific financial advice like "buy this" or "sell that"
- Instead, you explain what's happening and help people make informed decisions

When answering:
- Keep responses concise (2-4 paragraphs max)
- Use simple language, avoid jargon unless you explain it
- Be helpful and educational
- If asked about a specific stock/crypto, explain what's happening and why
- Focus on helping users understand, not telling them what to do
- End naturally, no need for sign-offs or asking if they have more questions

Remember: You're explaining markets, not giving financial advice.`;

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

    return NextResponse.json({
      message: reply,
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
