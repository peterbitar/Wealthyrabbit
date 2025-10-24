"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import FilterChips from "@/components/FilterChips";

// Dummy data
const portfolioSummary = {
  totalValue: 42850.00,
  dayChange: +425.50,
  dayChangePercent: +1.42,
};

const stocks = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    shares: 25,
    avgPrice: 150.50,
    currentPrice: 175.25,
    totalValue: 4381.25,
    dayChange: +2.5,
    sentiment: "positive",
    vibe: "Steady & Reliable",
    redditMentions: 1240,
    redditBenchmark: 1100, // avg for AAPL
    momentum: "Building",
    friendsWatching: 8,
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    shares: 15,
    avgPrice: 245.00,
    currentPrice: 238.50,
    totalValue: 3577.50,
    dayChange: -1.8,
    sentiment: "neutral",
    vibe: "Choppy Waters",
    redditMentions: 3450,
    redditBenchmark: 4200, // avg for TSLA (below normal)
    momentum: "Cooling",
    friendsWatching: 12,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    shares: 10,
    avgPrice: 420.00,
    currentPrice: 485.75,
    totalValue: 4857.50,
    dayChange: +3.2,
    sentiment: "positive",
    vibe: "On Fire 🔥",
    redditMentions: 5680,
    redditBenchmark: 2800, // avg for NVDA (way above!)
    momentum: "Strong",
    friendsWatching: 15,
  },
];

const watchlist = [
  { symbol: "AMZN", name: "Amazon", price: 142.50, change: +1.2, sentiment: "positive", vibe: "Quiet strength", buzz: "Low" },
  { symbol: "GOOGL", name: "Alphabet", price: 138.25, change: -0.5, sentiment: "neutral", vibe: "Consolidating", buzz: "Medium" },
  { symbol: "MSFT", name: "Microsoft", price: 378.85, change: +2.1, sentiment: "positive", vibe: "AI wave", buzz: "High" },
];

const aiInsight = "Markets are breathing easy today. Your portfolio's up 1.4% — mostly thanks to NVDA's chip rally. No major moves needed. Everything's cruising.";

export default function Portfolio() {
  const [holdingsFilter, setHoldingsFilter] = useState("All");
  const [watchlistFilter, setWatchlistFilter] = useState("All");

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
            ${portfolioSummary.totalValue.toLocaleString()}
          </h2>

          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-semibold ${
                portfolioSummary.dayChange >= 0
                  ? "text-rabbit-success"
                  : "text-rabbit-error"
              }`}
            >
              {portfolioSummary.dayChange >= 0 ? "+" : ""}
              ${Math.abs(portfolioSummary.dayChange).toFixed(2)}
            </span>
            <span
              className={`text-sm ${
                portfolioSummary.dayChange >= 0
                  ? "text-rabbit-success/70"
                  : "text-rabbit-error/70"
              }`}
            >
              ({portfolioSummary.dayChangePercent >= 0 ? "+" : ""}
              {portfolioSummary.dayChangePercent.toFixed(2)}%)
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
            <p className="text-sm text-gray-300 leading-relaxed">{aiInsight}</p>
          </div>
        </div>
      </motion.div>

      {/* Holdings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-200">Holdings</h3>
          <button className="text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium">
            See all →
          </button>
        </div>

        <FilterChips
          filters={["All", "Winning", "Losing", "Tech", "Finance"]}
          activeFilter={holdingsFilter}
          onFilterChange={setHoldingsFilter}
        />

        <div className="space-y-3">
          {stocks.map((stock, index) => (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-rabbit-card rounded-2xl p-4 border border-rabbit-border hover:border-rabbit-mint-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
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
          <button className="text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium">
            See all →
          </button>
        </div>

        <FilterChips
          filters={["All", "High Priority", "Tech", "Finance"]}
          activeFilter={watchlistFilter}
          onFilterChange={setWatchlistFilter}
        />

        <div className="space-y-2">
          {watchlist.map((stock, index) => (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="bg-rabbit-card/50 rounded-xl p-3 border border-rabbit-border/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
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

              <div className="text-right">
                <p className="text-sm font-medium text-gray-200">
                  ${stock.price}
                </p>
                <p
                  className={`text-xs ${
                    stock.change >= 0
                      ? "text-rabbit-success"
                      : "text-rabbit-error"
                  }`}
                >
                  {stock.change >= 0 ? "+" : ""}
                  {stock.change.toFixed(1)}%
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-600">{stock.vibe}</span>
                  <span className={`text-xs ${
                    stock.buzz === "High" ? "text-rabbit-mint-400" :
                    stock.buzz === "Medium" ? "text-gray-500" :
                    "text-gray-600"
                  }`}>
                    • {stock.buzz} buzz
                  </span>
                </div>
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
    </div>
  );
}
