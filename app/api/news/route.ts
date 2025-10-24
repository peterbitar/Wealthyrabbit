import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FinnhubNewsArticle {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol is required" },
      { status: 400 }
    );
  }

  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json(
      { error: "Missing Finnhub API key. Add FINNHUB_API_KEY to your .env file (grab one free at https://finnhub.io/register)" },
      { status: 500 }
    );
  }

  try {
    // Calculate date range (last 7 days)
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);

    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];

    // Fetch news from Finnhub
    const finnhubUrl = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`;

    const response = await fetch(finnhubUrl);

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const newsArticles: FinnhubNewsArticle[] = await response.json();

    if (!newsArticles || newsArticles.length === 0) {
      return NextResponse.json({
        symbol,
        summary: `No news for ${symbol} lately (checked last 7 days). Try a bigger ticker maybe?`,
        timestamp: new Date().toISOString(),
      });
    }

    // Take top 5 most recent articles
    const recentArticles = newsArticles.slice(0, 5);

    // Format articles for OpenAI summarization
    const articlesText = recentArticles.map((article, idx) => {
      const date = new Date(article.datetime * 1000).toLocaleDateString();
      return `${idx + 1}. [${date}] ${article.headline}\n   Source: ${article.source}\n   ${article.summary}`;
    }).join('\n\n');

    // Use OpenAI to create a concise summary
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You're a sharp finance analyst who explains complex market moves in simple terms. You understand:
- How earnings, revenue, and guidance actually impact stock prices
- The difference between short-term noise and long-term trends
- When news is already priced in vs. actually meaningful
- Industry dynamics and competitive positioning

Explain things like you're talking to smart college students - casual but insightful. No fluff, just real analysis.`
        },
        {
          role: "user",
          content: `Analyze these ${symbol} news articles and give me the real deal:

${articlesText}

Break it down:
1. **The Vibe**: Are we bullish, bearish, or mixed? Why?

2. **What's Actually Happening**: The 2-3 most important developments (not just headlines - explain WHY they matter for the business)

3. **The Real Impact**:
   - Is this news actually moving the needle or just noise?
   - What should investors watch next?
   - Any red flags or opportunities?

Keep it under 200 words. Be honest - if the news is overhyped, say it. If there's something sketchy, call it out.`
        }
      ],
      max_tokens: 400,
    });

    const aiSummary = completion.choices[0]?.message?.content || "Unable to generate summary";

    return NextResponse.json({
      symbol,
      summary: aiSummary,
      articlesCount: recentArticles.length,
      topHeadlines: recentArticles.slice(0, 3).map(a => ({
        headline: a.headline,
        date: new Date(a.datetime * 1000).toLocaleDateString(),
        url: a.url,
      })),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error fetching news:", error);

    if (error instanceof Error && error.message.includes("API key")) {
      return NextResponse.json(
        { error: "API key issue - double check your .env file" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong fetching the news" },
      { status: 500 }
    );
  }
}
