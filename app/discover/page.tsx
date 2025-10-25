"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import FilterChips from "@/components/FilterChips";
import TimeFilter from "@/components/TimeFilter";

// Default dummy data (will be replaced with API data)
const defaultTrendingStocks = [
  {
    symbol: "PLTR",
    name: "Palantir",
    price: 18.45,
    change: +12.3,
    volume: "High",
    reason: "AI contract news",
    redditVibe: "FOMO building",
    socialScore: 92,
    socialBenchmark: 45, // way above normal
    retailInterest: "Exploding 🚀",
  },
  {
    symbol: "COIN",
    name: "Coinbase",
    price: 156.20,
    change: +8.7,
    volume: "Very High",
    reason: "Crypto rally",
    redditVibe: "Euphoric",
    socialScore: 88,
    socialBenchmark: 60, // above normal
    retailInterest: "Very High",
  },
  {
    symbol: "SHOP",
    name: "Shopify",
    price: 65.80,
    change: -3.2,
    volume: "Medium",
    reason: "Earnings miss",
    redditVibe: "Buying dip",
    socialScore: 65,
    socialBenchmark: 70, // below normal
    retailInterest: "Mixed",
  },
];

const expertTakes = [
  {
    expert: "Cathie Wood",
    source: "ARK Invest",
    take: "AI infrastructure spending will accelerate through 2025. NVDA remains undervalued despite the rally.",
    time: "2h ago",
  },
  {
    expert: "Michael Burry",
    source: "Scion Asset",
    take: "Market showing classic late-cycle behavior. Watching credit spreads closely.",
    time: "5h ago",
  },
  {
    expert: "Bill Ackman",
    source: "Pershing Square",
    take: "Quality companies trading at reasonable valuations. Time to be selective, not reactive.",
    time: "1d ago",
  },
];

const fromFriends = [
  {
    friend: "Sarah",
    avatar: "S",
    stocks: ["AAPL", "TSLA"],
    action: "added to watchlist",
    time: "30m ago",
  },
  {
    friend: "Mike",
    avatar: "M",
    stocks: ["NVDA"],
    action: "bought shares",
    time: "2h ago",
  },
  {
    friend: "Alex",
    avatar: "A",
    stocks: ["AMZN", "GOOGL"],
    action: "added to portfolio",
    time: "5h ago",
  },
];

const newsletters = [
  {
    title: "The Daily Upside",
    headline: "Fed signals pause on rate cuts - markets digest",
    preview: "Powell's comments suggest the Fed is comfortable holding rates steady through Q1...",
    time: "This morning",
  },
  {
    title: "Morning Brew",
    headline: "Tech earnings: The good, the bad, and the AI",
    preview: "Big Tech delivered mixed results, but one theme emerged clear: AI spending isn't slowing...",
    time: "Yesterday",
  },
];

const news = [
  {
    source: "Bloomberg",
    logo: "📊",
    headline: "Apple hits all-time high on strong iPhone demand in Asia",
    preview: "Shares rose 2.8% as analysts upgraded price targets following better-than-expected sales data from China and India...",
    time: "15m ago",
    relevantTo: ["AAPL"],
  },
  {
    source: "CNBC",
    logo: "📺",
    headline: "Tesla stock jumps on Musk's announcement of new battery technology",
    preview: "The EV maker unveiled plans for a revolutionary battery that could extend range by 40%. Markets reacted positively...",
    time: "1h ago",
    relevantTo: ["TSLA"],
  },
  {
    source: "Wall Street Journal",
    logo: "📰",
    headline: "Nvidia CEO says AI chip demand 'still outstripping supply'",
    preview: "Jensen Huang told investors the company is ramping up production but can't keep pace with enterprise demand...",
    time: "2h ago",
    relevantTo: ["NVDA"],
  },
  {
    source: "Reuters",
    logo: "🌐",
    headline: "Federal Reserve minutes reveal divided committee on rate cuts",
    preview: "Several members expressed concerns about inflation persistence, while others favored a more dovish approach...",
    time: "3h ago",
    relevantTo: [],
  },
  {
    source: "Financial Times",
    logo: "💼",
    headline: "Tech sector leads market rally as earnings season kicks off",
    preview: "Major indices climbed as investor sentiment improved heading into a busy week of tech company reports...",
    time: "4h ago",
    relevantTo: ["AAPL", "NVDA", "GOOGL"],
  },
];

export default function Discover() {
  const [trendingFilter, setTrendingFilter] = useState("All");
  const [trendingTime, setTrendingTime] = useState("Today");
  const [expertFilter, setExpertFilter] = useState("All");
  const [expertTime, setExpertTime] = useState("This Week");
  const [friendsFilter, setFriendsFilter] = useState("All");
  const [friendsTime, setFriendsTime] = useState("Today");
  const [newsletterFilter, setNewsletterFilter] = useState("All");
  const [newsletterTime, setNewsletterTime] = useState("This Week");
  const [newsFilter, setNewsFilter] = useState("All");
  const [newsTime, setNewsTime] = useState("Today");

  // State for API data
  const [trendingStocks, setTrendingStocks] = useState<any[]>(defaultTrendingStocks);
  const [loading, setLoading] = useState(true);

  // Fetch trending stocks from API
  useEffect(() => {
    async function fetchTrendingStocks() {
      try {
        const response = await fetch('/api/stocks/trending');
        const data = await response.json();

        if (data.stocks) {
          // Transform API data to match UI expectations
          const transformedStocks = data.stocks.map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.name,
            price: stock.currentPrice,
            change: stock.dayChangePercent,
            volume: stock.momentum === 'Strong' ? 'Very High' : stock.momentum === 'Building' ? 'High' : 'Medium',
            reason: stock.vibe,
            redditVibe: stock.vibe,
            socialScore: stock.redditMentions,
            socialBenchmark: stock.redditBenchmark,
            retailInterest: stock.momentum,
            sentiment: stock.sentiment,
            friendsWatching: stock.friendsWatching,
          }));
          setTrendingStocks(transformedStocks);
        }
      } catch (error) {
        console.error('Error fetching trending stocks:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrendingStocks();
  }, []);

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-4"
      >
        <h1 className="text-2xl font-semibold text-gray-100 mb-1">
          Discover
        </h1>
        <p className="text-sm text-gray-400">
          Your daily curiosity feed
        </p>
      </motion.div>

      {/* Trending Now */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-200">🔥 Trending Now</h2>
            <span className="text-xs text-gray-500">Live</span>
          </div>
          <button className="text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium">
            See all →
          </button>
        </div>

        <FilterChips
          filters={["All", "My Stocks", "Tech", "Finance", "Crypto"]}
          activeFilter={trendingFilter}
          onFilterChange={setTrendingFilter}
        />

        <TimeFilter
          activeTime={trendingTime}
          onTimeChange={setTrendingTime}
        />

        <div className="space-y-3">
          {trendingStocks.map((stock, index) => (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-rabbit-card rounded-2xl p-4 border border-rabbit-border hover:border-rabbit-mint-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-100">{stock.symbol}</h3>
                    <span className="text-xs px-2 py-0.5 bg-rabbit-mint-500/10 text-rabbit-mint-400 rounded-full">
                      {stock.volume}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{stock.name}</p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-gray-100">${stock.price}</p>
                  <p
                    className={`text-sm ${
                      stock.change >= 0 ? "text-rabbit-success" : "text-rabbit-error"
                    }`}
                  >
                    {stock.change >= 0 ? "+" : ""}
                    {stock.change.toFixed(1)}%
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                <span className="text-rabbit-lavender-400">→</span> {stock.reason}
              </p>

              {/* Relatable Stats */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-rabbit-border/30">
                <div>
                  <p className="text-xs text-gray-600">Reddit Vibe</p>
                  <p className="text-xs font-medium text-gray-300">{stock.redditVibe}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Social Buzz</p>
                  <p className={`text-xs font-medium ${
                    stock.socialScore > stock.socialBenchmark * 1.5 ? "text-rabbit-success" :
                    stock.socialScore > stock.socialBenchmark * 1.2 ? "text-rabbit-mint-400" :
                    stock.socialScore < stock.socialBenchmark * 0.8 ? "text-rabbit-error" :
                    "text-gray-400"
                  }`}>
                    {stock.socialScore > stock.socialBenchmark * 1.5 ? "Way above avg" :
                     stock.socialScore > stock.socialBenchmark * 1.2 ? "Above avg" :
                     stock.socialScore < stock.socialBenchmark * 0.8 ? "Below avg" :
                     "Normal"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Retail Interest</p>
                  <p className="text-xs font-medium text-gray-300">{stock.retailInterest}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Expert Takes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">💭 Expert Takes</h2>
          <button className="text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium">
            See all →
          </button>
        </div>

        <FilterChips
          filters={["All", "My Stocks", "Bullish", "Bearish", "Neutral"]}
          activeFilter={expertFilter}
          onFilterChange={setExpertFilter}
        />

        <TimeFilter
          activeTime={expertTime}
          onTimeChange={setExpertTime}
        />

        <div className="space-y-3">
          {expertTakes.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-rabbit-card/50 rounded-2xl p-4 border border-rabbit-border/50"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-gray-200">{item.expert}</h4>
                  <p className="text-xs text-gray-500">{item.source}</p>
                </div>
                <span className="text-xs text-gray-600">{item.time}</span>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed">{item.take}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* From Friends */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">👥 From Friends</h2>
          <button className="text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium">
            See all →
          </button>
        </div>

        <FilterChips
          filters={["All", "Recent", "Watching", "Bought"]}
          activeFilter={friendsFilter}
          onFilterChange={setFriendsFilter}
        />

        <TimeFilter
          activeTime={friendsTime}
          onTimeChange={setFriendsTime}
        />

        <div className="space-y-2">
          {fromFriends.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="bg-rabbit-card/30 rounded-xl p-3 border border-rabbit-lavender-500/10 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-rabbit-lavender-500 to-rabbit-mint-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {item.avatar}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">
                  <span className="font-medium text-gray-100">{item.friend}</span>{" "}
                  {item.action}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {item.stocks.map((stock) => (
                    <span
                      key={stock}
                      className="text-xs px-2 py-0.5 bg-rabbit-lavender-500/10 text-rabbit-lavender-300 rounded"
                    >
                      {stock}
                    </span>
                  ))}
                </div>
              </div>

              <span className="text-xs text-gray-600 flex-shrink-0">{item.time}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Newsletters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">📬 Newsletters</h2>
          <button className="text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium">
            See all →
          </button>
        </div>

        <FilterChips
          filters={["All", "My Stocks", "Market News", "Tech"]}
          activeFilter={newsletterFilter}
          onFilterChange={setNewsletterFilter}
        />

        <TimeFilter
          activeTime={newsletterTime}
          onTimeChange={setNewsletterTime}
        />

        <div className="space-y-3">
          {newsletters.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + index * 0.1 }}
              className="bg-rabbit-card rounded-2xl p-4 border border-rabbit-border"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-xs font-medium text-rabbit-mint-400">{item.title}</h4>
                <span className="text-xs text-gray-600">{item.time}</span>
              </div>

              <h3 className="text-sm font-semibold text-gray-100 mb-1">
                {item.headline}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">{item.preview}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* News */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">📰 News</h2>
          <button className="text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium">
            See all →
          </button>
        </div>

        <FilterChips
          filters={["All", "My Stocks", "Breaking", "Markets", "Tech"]}
          activeFilter={newsFilter}
          onFilterChange={setNewsFilter}
        />

        <TimeFilter
          activeTime={newsTime}
          onTimeChange={setNewsTime}
        />

        <div className="space-y-3">
          {news.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + index * 0.1 }}
              className="bg-rabbit-card rounded-2xl p-4 border border-rabbit-border hover:border-rabbit-mint-500/30 transition-all"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="text-2xl flex-shrink-0">{item.logo}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-medium text-rabbit-lavender-400">{item.source}</h4>
                    <span className="text-xs text-gray-600">{item.time}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-100 mb-1">
                    {item.headline}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-2">{item.preview}</p>

                  {item.relevantTo.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-gray-600">Relevant to:</span>
                      {item.relevantTo.map((ticker) => (
                        <span
                          key={ticker}
                          className="text-xs px-2 py-0.5 bg-rabbit-mint-500/10 text-rabbit-mint-400 rounded"
                        >
                          {ticker}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Calm empty state */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="text-center py-6"
      >
        <p className="text-sm text-gray-500">
          That's all for now. Come back later for more 🌿
        </p>
      </motion.div>
    </div>
  );
}
