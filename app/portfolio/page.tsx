"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import FilterChips from "@/components/FilterChips";
import AddStockModal from "@/components/AddStockModal";

export default function Portfolio() {
  const [holdingsFilter, setHoldingsFilter] = useState("All");
  const [watchlistFilter, setWatchlistFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showAddWatchlist, setShowAddWatchlist] = useState(false);

  // Hardcoded test user ID (in production, get from auth)
  const userId = "cmh503gjd00008okpn9ic7cia";

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`/api/portfolio/summary?userId=${userId}`);
      const data = await response.json();
      setPortfolioData(data);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Delete holding
  const deleteHolding = async (holdingId: string) => {
    try {
      const response = await fetch(`/api/portfolio/holdings?id=${holdingId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // Refresh portfolio data
        await fetchPortfolio();
      }
    } catch (error) {
      console.error('Error deleting holding:', error);
    }
  };

  // Delete from watchlist
  const deleteFromWatchlist = async (watchlistId: string) => {
    try {
      const response = await fetch(`/api/portfolio/watchlist?id=${watchlistId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // Refresh portfolio data
        await fetchPortfolio();
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-gray-400">Loading portfolio...</div>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-gray-400">Failed to load portfolio</div>
      </div>
    );
  }

  const { summary, holdings, watchlist } = portfolioData;

  // Filter holdings based on selected filter
  const filteredHoldings = holdings.filter((stock: any) => {
    if (holdingsFilter === "All") return true;
    if (holdingsFilter === "Winning") return stock.gainLossPercent > 0;
    if (holdingsFilter === "Losing") return stock.gainLossPercent < 0;
    if (holdingsFilter === "Tech") return ["AAPL", "NVDA", "TSLA", "META", "GOOGL", "MSFT", "AMZN", "NFLX"].includes(stock.symbol);
    if (holdingsFilter === "Finance") return ["JPM", "GS", "BAC", "WFC", "C"].includes(stock.symbol);
    return true;
  });

  // Filter watchlist based on selected filter
  const filteredWatchlist = watchlist.filter((stock: any) => {
    if (watchlistFilter === "All") return true;
    if (watchlistFilter === "High Priority") return stock.dayChange > 2 || stock.dayChange < -2;
    if (watchlistFilter === "Tech") return ["AAPL", "NVDA", "TSLA", "META", "GOOGL", "MSFT", "AMZN", "NFLX"].includes(stock.symbol);
    if (watchlistFilter === "Finance") return ["JPM", "GS", "BAC", "WFC", "C"].includes(stock.symbol);
    return true;
  });

  // Generate AI insight based on portfolio performance
  const generateInsight = () => {
    const { dayChangePercent, totalGainLossPercent } = summary;
    const topGainer = holdings.sort((a: any, b: any) => b.gainLossPercent - a.gainLossPercent)[0];

    if (dayChangePercent > 1) {
      return `Nice! Your portfolio's up ${dayChangePercent.toFixed(1)}% today. ${topGainer?.name || 'Your top holding'} is leading the charge. Keep riding the wave 🌊`;
    } else if (dayChangePercent > 0) {
      return `Markets are calm today. Your portfolio's up ${dayChangePercent.toFixed(1)}% — steady as she goes. No drama, no worries.`;
    } else if (dayChangePercent > -1) {
      return `Small dip of ${Math.abs(dayChangePercent).toFixed(1)}% today, but you're still up ${totalGainLossPercent.toFixed(1)}% overall. Short-term noise, long-term gains 💪`;
    } else {
      return `Rough day with a ${Math.abs(dayChangePercent).toFixed(1)}% drop. Remember: you're still up ${totalGainLossPercent.toFixed(1)}% overall. This is temporary.`;
    }
  };

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-4"
      >
        <h1 className="text-2xl font-semibold text-gray-100 mb-1">
          Your Portfolio
        </h1>
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </motion.div>

      {/* Portfolio Summary Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-rabbit-card to-rabbit-border rounded-3xl p-6 relative overflow-hidden"
      >
        {/* Breathing glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-rabbit-mint-500/10 rounded-full blur-3xl animate-breathe" />

        <div className="relative z-10">
          <p className="text-sm text-gray-400 mb-2">Total Value</p>
          <h2 className="text-4xl font-bold text-gray-100 mb-4">
            ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>

          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-semibold ${
                summary.dayChange >= 0
                  ? "text-rabbit-success"
                  : "text-rabbit-error"
              }`}
            >
              {summary.dayChange >= 0 ? "+" : ""}
              ${Math.abs(summary.dayChange).toFixed(2)}
            </span>
            <span
              className={`text-sm ${
                summary.dayChange >= 0
                  ? "text-rabbit-success/70"
                  : "text-rabbit-error/70"
              }`}
            >
              ({summary.dayChangePercent >= 0 ? "+" : ""}
              {summary.dayChangePercent.toFixed(2)}%)
            </span>
            <span className="text-gray-500 text-sm">today</span>
          </div>
        </div>
      </motion.div>

      {/* AI Insight */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-rabbit-card/50 border border-rabbit-lavender-500/20 rounded-2xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-rabbit-lavender-500/10 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🐇</span>
          </div>
          <div>
            <p className="text-sm font-medium text-rabbit-lavender-300 mb-1">
              Today's Insight
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">{generateInsight()}</p>
          </div>
        </div>
      </motion.div>

      {/* Holdings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-200">Holdings</h3>
          <button
            onClick={() => setShowAddHolding(true)}
            className="flex items-center gap-1 text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Stock
          </button>
        </div>

        <FilterChips
          filters={["All", "Winning", "Losing", "Tech", "Finance"]}
          activeFilter={holdingsFilter}
          onFilterChange={setHoldingsFilter}
        />

        <div className="space-y-3">
          {filteredHoldings.map((stock: any, index: number) => (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-rabbit-card rounded-2xl p-4 border border-rabbit-border hover:border-rabbit-mint-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  {/* Sentiment indicator */}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      stock.sentiment === "positive"
                        ? "bg-rabbit-success animate-breathe"
                        : stock.sentiment === "negative"
                        ? "bg-rabbit-error animate-breathe"
                        : "bg-gray-500"
                    }`}
                  />
                  <div>
                    <h4 className="font-semibold text-gray-100">
                      {stock.symbol}
                    </h4>
                    <p className="text-xs text-gray-500">{stock.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-gray-100">
                      ${stock.totalValue.toLocaleString()}
                    </p>
                    <p
                      className={`text-xs ${
                        stock.dayChange >= 0
                          ? "text-rabbit-success"
                          : "text-rabbit-error"
                      }`}
                    >
                      {stock.dayChange >= 0 ? "+" : ""}
                      {stock.dayChange.toFixed(1)}%
                    </p>
                  </div>
                  <button
                    onClick={() => deleteHolding(stock.id)}
                    className="p-2 hover:bg-rabbit-error/10 rounded-lg transition-colors"
                    title="Remove from portfolio"
                  >
                    <svg className="w-4 h-4 text-gray-500 hover:text-rabbit-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>
                  {stock.shares} shares × ${stock.currentPrice}
                </span>
                <span>
                  Avg ${stock.avgPrice}
                </span>
              </div>

              {/* Relatable Stats */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-rabbit-border/30">
                <div>
                  <p className="text-xs text-gray-600">Vibe</p>
                  <p className="text-xs font-medium text-gray-300">{stock.vibe}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Reddit Buzz</p>
                  <p className={`text-xs font-medium ${
                    stock.redditMentions > stock.redditBenchmark * 1.5 ? "text-rabbit-success" :
                    stock.redditMentions > stock.redditBenchmark ? "text-rabbit-mint-400" :
                    stock.redditMentions < stock.redditBenchmark * 0.7 ? "text-rabbit-error" :
                    "text-gray-400"
                  }`}>
                    {stock.redditMentions > stock.redditBenchmark * 1.5 ? "Way above avg" :
                     stock.redditMentions > stock.redditBenchmark ? "Above avg" :
                     stock.redditMentions < stock.redditBenchmark * 0.7 ? "Below avg" :
                     "Normal"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Momentum</p>
                  <p className={`text-xs font-medium ${
                    stock.momentum === "Strong" ? "text-rabbit-success" :
                    stock.momentum === "Building" ? "text-rabbit-mint-400" :
                    "text-gray-400"
                  }`}>
                    {stock.momentum}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span>{stock.friendsWatching} friends watching</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Watchlist */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-200">Watching</h3>
          <button
            onClick={() => setShowAddWatchlist(true)}
            className="flex items-center gap-1 text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Stock
          </button>
        </div>

        <FilterChips
          filters={["All", "High Priority", "Tech", "Finance"]}
          activeFilter={watchlistFilter}
          onFilterChange={setWatchlistFilter}
        />

        <div className="space-y-2">
          {filteredWatchlist.map((stock: any, index: number) => (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="bg-rabbit-card/50 rounded-xl p-3 border border-rabbit-border/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    stock.sentiment === "positive"
                      ? "bg-rabbit-success"
                      : "bg-gray-500"
                  }`}
                />
                <div>
                  <h4 className="text-sm font-medium text-gray-200">
                    {stock.symbol}
                  </h4>
                  <p className="text-xs text-gray-500">{stock.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-200">
                    ${stock.currentPrice.toFixed(2)}
                  </p>
                  <p
                    className={`text-xs ${
                      stock.dayChange >= 0
                        ? "text-rabbit-success"
                        : "text-rabbit-error"
                    }`}
                  >
                    {stock.dayChange >= 0 ? "+" : ""}
                    {stock.dayChange.toFixed(2)}%
                  </p>
                </div>
                <button
                  onClick={() => deleteFromWatchlist(stock.id)}
                  className="p-2 hover:bg-rabbit-error/10 rounded-lg transition-colors"
                  title="Remove from watchlist"
                >
                  <svg className="w-4 h-4 text-gray-500 hover:text-rabbit-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Empty state message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center py-8"
      >
        <p className="text-sm text-gray-500">
          🐇 Markets are quiet — your portfolio's resting too
        </p>
      </motion.div>

      {/* Modals */}
      <AddStockModal
        isOpen={showAddHolding}
        onClose={() => setShowAddHolding(false)}
        onAdd={fetchPortfolio}
        userId={userId}
        mode="holding"
      />
      <AddStockModal
        isOpen={showAddWatchlist}
        onClose={() => setShowAddWatchlist(false)}
        onAdd={fetchPortfolio}
        userId={userId}
        mode="watchlist"
      />
    </div>
  );
}
