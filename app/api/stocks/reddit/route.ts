import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/stocks/reddit
 * Get Reddit posts mentioning a specific stock
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Reddit API not configured' },
      { status: 500 }
    );
  }

  try {
    // Get Reddit access token
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json({
        posts: [],
        message: 'Failed to authenticate with Reddit'
      });
    }

    // Search for posts mentioning the stock symbol
    const searchResponse = await fetch(
      `https://oauth.reddit.com/r/wallstreetbets/search?q=${symbol}&restrict_sr=1&sort=hot&limit=20&t=week`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'WealthyRabbit:v1.0.0',
        },
      }
    );

    const searchData = await searchResponse.json();

    if (!searchData.data?.children) {
      return NextResponse.json({
        posts: [],
        message: 'No Reddit posts found'
      });
    }

    // Transform Reddit posts
    const posts = searchData.data.children
      .map((child: any) => {
        const post = child.data;
        const timestamp = post.created_utc * 1000;
        const now = Date.now();
        const diff = now - timestamp;

        // Format relative time
        let relatedTime: string;
        if (diff < 3600000) {
          relatedTime = `${Math.floor(diff / 60000)}m ago`;
        } else if (diff < 86400000) {
          relatedTime = `${Math.floor(diff / 3600000)}h ago`;
        } else {
          relatedTime = `${Math.floor(diff / 86400000)}d ago`;
        }

        return {
          title: post.title,
          score: post.score,
          url: `https://reddit.com${post.permalink}`,
          timestamp,
          relatedTime,
        };
      })
      .filter((post: any) => post.score > 10) // Filter low-score posts
      .slice(0, 15); // Limit to 15 posts

    return NextResponse.json({
      posts,
      symbol,
    });
  } catch (error) {
    console.error('Error fetching Reddit posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Reddit posts' },
      { status: 500 }
    );
  }
}
