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
      { error: "Missing Finnhub API key. Add FINNHUB_API_KEY to your .env file" },
      { status: 500 }
    );
  }

  try {
    // Fetch both news and Reddit data in parallel
    const [newsResponse, redditData] = await Promise.all([
      fetchNewsData(symbol),
      fetchRedditData(symbol),
    ]);

    // Combine both datasets for comprehensive analysis
    const combinedAnalysis = await generateCombinedAnalysis(
      symbol,
      newsResponse.newsArticles,
      redditData.posts
    );

    return NextResponse.json({
      symbol,
      analysis: combinedAnalysis,
      newsCount: newsResponse.count,
      redditMentions: redditData.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating analysis:", error);
    return NextResponse.json(
      { error: "Couldn't generate analysis right now" },
      { status: 500 }
    );
  }
}

async function fetchNewsData(symbol: string) {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);

  const from = fromDate.toISOString().split("T")[0];
  const to = toDate.toISOString().split("T")[0];

  const response = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
  );

  if (!response.ok) {
    return { newsArticles: [], count: 0 };
  }

  const newsArticles: FinnhubNewsArticle[] = await response.json();
  return {
    newsArticles: newsArticles.slice(0, 5),
    count: newsArticles.length,
  };
}

async function fetchRedditData(symbol: string) {
  const searchResults = await Promise.all([
    fetch(
      `https://www.reddit.com/r/wallstreetbets/search.json?q=${encodeURIComponent(
        symbol
      )}&restrict_sr=1&sort=relevance&t=week&limit=10`,
      {
        headers: {
          "User-Agent": "WealthyRabbit:v1.0.0",
        },
      }
    ),
    fetch(
      `https://www.reddit.com/r/stocks/search.json?q=${encodeURIComponent(
        symbol
      )}&restrict_sr=1&sort=relevance&t=week&limit=10`,
      {
        headers: {
          "User-Agent": "WealthyRabbit:v1.0.0",
        },
      }
    ),
  ]);

  const allPosts: any[] = [];

  for (const response of searchResults) {
    if (response.ok) {
      const data = await response.json();
      const posts = data.data?.children || [];
      allPosts.push(...posts.map((p: any) => p.data));
    }
  }

  const uniquePosts = Array.from(
    new Map(allPosts.map((post) => [post.id, post])).values()
  );

  return {
    posts: uniquePosts.slice(0, 5),
    count: uniquePosts.length,
  };
}

async function generateCombinedAnalysis(
  symbol: string,
  newsArticles: FinnhubNewsArticle[],
  redditPosts: any[]
) {
  // Format news articles
  const newsText =
    newsArticles.length > 0
      ? newsArticles
          .map((article, idx) => {
            const date = new Date(article.datetime * 1000).toLocaleDateString();
            return `${idx + 1}. [${date}] ${article.headline}\n   ${article.summary}`;
          })
          .join("\n\n")
      : "No recent news found.";

  // Format Reddit posts
  const redditText =
    redditPosts.length > 0
      ? redditPosts
          .map((post: any, idx: number) => {
            return `${idx + 1}. r/${post.subreddit} | ${post.score} upvotes\n   ${post.title}`;
          })
          .join("\n\n")
      : "No recent Reddit discussion found.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You're a market historian and pattern analyst. You don't give advice - you just present facts about:
- What historically happens when stocks face similar news/sentiment combinations
- Statistical patterns and historical precedents
- How similar situations played out in the past (specific examples when possible)
- What the data shows, without recommendations

You're factual, educational, and objective. You help people learn from market history without telling them what to do.`,
      },
      {
        role: "user",
        content: `Analyze ${symbol} by combining both news and social sentiment. Here's what's happening:

**Recent News:**
${newsText}

**Reddit Sentiment:**
${redditText}

Give me a factual analysis in this format:

**1. Current Situation**
What's actually happening with ${symbol} right now? (Combine news + sentiment into 2-3 factual statements)

**2. Historical Patterns**
Based on this combination of news/sentiment, what have we seen historically in similar cases?
- Find 1-2 comparable situations from past market events
- What actually happened in those cases? (Be specific with outcomes)
- What were the timeframes?

**3. Key Data Points**
What are the important facts to track going forward? (metrics, dates, events)

**4. Historical Context**
- If retail sentiment is very different from news (high/low discord), what does historical data show about these divergences?
- When similar patterns appeared before, what % moved which direction?
- Any historical red flags or positive precedents worth noting?

Keep it under 250 words. Stick to facts and historical data - zero advice or predictions. Just "historically, when X happened, Y occurred Z% of the time" type analysis.`,
      },
    ],
    max_tokens: 500,
  });

  return (
    completion.choices[0]?.message?.content ||
    "Unable to generate analysis"
  );
}
