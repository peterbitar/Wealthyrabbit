import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Ticker symbol is required" },
      { status: 400 }
    );
  }

  // No auth needed - we're using Reddit's public JSON API

  try {
    // Fetch from Reddit's JSON API directly (no auth needed for public data)
    // Much simpler than using OAuth for read-only access
    const searchResults = await Promise.all([
      fetch(
        `https://www.reddit.com/r/wallstreetbets/search.json?q=${encodeURIComponent(
          symbol
        )}&restrict_sr=1&sort=relevance&t=week&limit=10`,
        {
          headers: {
            "User-Agent":
              process.env.REDDIT_USER_AGENT || "WealthyRabbit:v1.0.0",
          },
        }
      ),
      fetch(
        `https://www.reddit.com/r/stocks/search.json?q=${encodeURIComponent(
          symbol
        )}&restrict_sr=1&sort=relevance&t=week&limit=10`,
        {
          headers: {
            "User-Agent":
              process.env.REDDIT_USER_AGENT || "WealthyRabbit:v1.0.0",
          },
        }
      ),
      fetch(
        `https://www.reddit.com/r/investing/search.json?q=${encodeURIComponent(
          symbol
        )}&restrict_sr=1&sort=relevance&t=week&limit=10`,
        {
          headers: {
            "User-Agent":
              process.env.REDDIT_USER_AGENT || "WealthyRabbit:v1.0.0",
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

    if (allPosts.length === 0) {
      return NextResponse.json({
        symbol,
        summary: `No one's really talking about ${symbol} on Reddit lately. Might be flying under the radar rn.`,
        mentionCount: 0,
        topPosts: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Remove duplicates and sort by score
    const uniquePosts = Array.from(
      new Map(allPosts.map((post) => [post.id, post])).values()
    );
    const sortedPosts = uniquePosts.sort((a: any, b: any) => b.score - a.score);
    const topPosts = sortedPosts.slice(0, 5);

    // Format posts for AI analysis
    const postsText = topPosts
      .map((post: any, idx: number) => {
        const upvoteRatio = Math.round((post.upvote_ratio || 0) * 100);
        return `${idx + 1}. r/${post.subreddit} | ${post.score} upvotes (${upvoteRatio}% ratio)
Title: ${post.title}
${post.selftext ? `Text: ${post.selftext.slice(0, 300)}...` : ""}`;
      })
      .join("\n\n");

    // Use OpenAI to summarize the Reddit sentiment
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You're an experienced trader who browses Reddit to gauge retail sentiment. You know:
- The difference between solid DD (due diligence) and pump-and-dump hype
- When retail is early vs. late to a move
- What WSB/Reddit sentiment actually means for price action
- How to spot genuine conviction vs. bagholders coping

You explain Reddit sentiment like you're texting a smart friend - casual but with real insights. Call out BS when you see it.`
        },
        {
          role: "user",
          content: `Analyze what Reddit's saying about ${symbol}:

${postsText}

Give me the breakdown:

1. **Sentiment Check**: What's the overall vibe? (Bullish/Bearish/FOMO/Copium/Divided)

2. **Key Themes**: What are the top 2-3 things people are actually talking about?

3. **Quality Check**:
   - Is this solid research and discussion, or just hype and memes?
   - Are people making real arguments or just posting rockets?
   - What's the upvote ratio telling us about community agreement?

4. **Trading Signal**:
   - Is retail early, late, or right on time?
   - Does this sentiment match or contradict the news/fundamentals?
   - Any contrarian opportunities here?

Under 200 words. Be blunt - if people are coping or chasing, say it.`
        },
      ],
      max_tokens: 400,
    });

    const aiSummary =
      completion.choices[0]?.message?.content ||
      "Couldn't process the Reddit vibes";

    return NextResponse.json({
      symbol,
      summary: aiSummary,
      mentionCount: uniquePosts.length,
      topPosts: topPosts.slice(0, 3).map((post: any) => ({
        title: post.title,
        subreddit: post.subreddit,
        score: post.score,
        url: `https://reddit.com${post.permalink}`,
        upvoteRatio: Math.round((post.upvote_ratio || 0) * 100),
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching Reddit data:", error);

    if (error instanceof Error && error.message.includes("401")) {
      return NextResponse.json(
        { error: "Reddit API credentials are wrong - double check your .env" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Couldn't fetch Reddit data rn, try again later" },
      { status: 500 }
    );
  }
}
