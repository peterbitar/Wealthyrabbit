"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import Button from "./Button";
import Card from "./Card";
import PercentageBadge from "./PercentageBadge";

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
}

interface PricePoint {
  timestamp: number;
  date: string;
  time: string;
  price: number;
  change: number;
}

interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  timestamp: number;
  relatedTime: string;
}

interface RedditPost {
  title: string;
  score: number;
  url: string;
  timestamp: number;
  relatedTime: string;
}

export default function StockDetailModal({
  isOpen,
  onClose,
  symbol,
  name,
}: StockDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"chart" | "news" | "reddit">("chart");
  const [historicalData, setHistoricalData] = useState<PricePoint[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"1D" | "1W" | "1M" | "3M">("1W");

  // Fetch historical data, news, and reddit posts
  useEffect(() => {
    if (!isOpen) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch historical price data
        const priceResponse = await fetch(
          `/api/stocks/history?symbol=${symbol}&range=${timeRange}`
        );
        const priceData = await priceResponse.json();
        setHistoricalData(priceData.history || []);

        // Fetch news
        const newsResponse = await fetch(
          `/api/stocks/news?symbol=${symbol}`
        );
        const newsData = await newsResponse.json();
        setNewsItems(newsData.news || []);

        // Fetch reddit posts
        const redditResponse = await fetch(
          `/api/stocks/reddit?symbol=${symbol}`
        );
        const redditData = await redditResponse.json();
        setRedditPosts(redditData.posts || []);
      } catch (error) {
        console.error("Error fetching stock details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isOpen, symbol, timeRange]);

  // Get relevant news/reddit for hovered time period
  const getRelevantContent = (timestamp: number) => {
    // Use a 48-hour window (24 hours before and after)
    const timeWindow = 48 * 3600000;

    // Filter and sort news by proximity to hovered time
    const relevantNews = newsItems
      .map((item) => ({
        ...item,
        distance: Math.abs(item.timestamp - timestamp),
      }))
      .filter((item) => item.distance < timeWindow)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3); // Show top 3 closest

    // Filter and sort Reddit posts by proximity to hovered time
    const relevantReddit = redditPosts
      .map((post) => ({
        ...post,
        distance: Math.abs(post.timestamp - timestamp),
      }))
      .filter((post) => post.distance < timeWindow)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3); // Show top 3 closest

    return { news: relevantNews, reddit: relevantReddit };
  };

  const currentPrice =
    historicalData.length > 0
      ? historicalData[historicalData.length - 1].price
      : 0;
  const firstPrice = historicalData.length > 0 ? historicalData[0].price : 0;
  const priceChange = currentPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  const hoveredContent = hoveredPoint
    ? getRelevantContent(hoveredPoint.timestamp)
    : null;

  // Filter news and Reddit based on selected time range
  const getTimeRangeMs = () => {
    const now = Date.now();
    let from: number;

    switch (timeRange) {
      case '1D':
        from = now - 24 * 3600000;
        break;
      case '1W':
        from = now - 7 * 24 * 3600000;
        break;
      case '1M':
        from = now - 30 * 24 * 3600000;
        break;
      case '3M':
        from = now - 90 * 24 * 3600000;
        break;
      default:
        from = now - 7 * 24 * 3600000;
    }

    return { from, to: now };
  };

  const { from: rangeFrom, to: rangeTo } = getTimeRangeMs();

  // Filter news and reddit by time range
  const filteredNews = newsItems.filter(
    (item) => item.timestamp >= rangeFrom && item.timestamp <= rangeTo
  );

  const filteredReddit = redditPosts.filter(
    (post) => post.timestamp >= rangeFrom && post.timestamp <= rangeTo
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-10 z-50 bg-rabbit-bg rounded-3xl border border-rabbit-border overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-rabbit-border flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
                  {symbol}
                  <span className="text-base font-normal text-gray-500">
                    {name}
                  </span>
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-3xl font-bold text-gray-100">
                    ${currentPrice.toFixed(2)}
                  </span>
                  <PercentageBadge value={priceChangePercent} size="lg" />
                  <span
                    className={`text-sm ${
                      priceChange >= 0 ? "text-rabbit-success" : "text-rabbit-error"
                    }`}
                  >
                    {priceChange >= 0 ? "+" : ""}${Math.abs(priceChange).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-rabbit-card border border-rabbit-border hover:border-rabbit-error/50 flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 flex gap-2 border-b border-rabbit-border">
              {(["chart", "news", "reddit"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors relative ${
                    activeTab === tab
                      ? "text-rabbit-mint-400 bg-rabbit-card"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-rabbit-mint-500"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : (
                <>
                  {activeTab === "chart" && (
                    <div className="space-y-6">
                      {/* Time Range Selector */}
                      <div className="flex gap-2">
                        {(["1D", "1W", "1M", "3M"] as const).map((range) => (
                          <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              timeRange === range
                                ? "bg-rabbit-mint-500/20 text-rabbit-mint-400 border border-rabbit-mint-500/30"
                                : "bg-rabbit-card text-gray-500 border border-rabbit-border hover:border-rabbit-mint-500/30"
                            }`}
                          >
                            {range}
                          </button>
                        ))}
                      </div>

                      {/* Chart */}
                      <div className="bg-rabbit-card rounded-2xl p-6 border border-rabbit-border">
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart
                            data={historicalData}
                            onMouseMove={(e: any) => {
                              if (e.activePayload) {
                                setHoveredPoint(e.activePayload[0].payload);
                              }
                            }}
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            <XAxis
                              dataKey="time"
                              stroke="#6b7280"
                              style={{ fontSize: "12px" }}
                            />
                            <YAxis
                              stroke="#6b7280"
                              style={{ fontSize: "12px" }}
                              domain={["auto", "auto"]}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-rabbit-card border border-rabbit-border rounded-lg p-3 shadow-lg">
                                      <p className="text-xs text-gray-500 mb-1">
                                        {data.date} {data.time}
                                      </p>
                                      <p className="text-lg font-bold text-gray-100">
                                        ${data.price.toFixed(2)}
                                      </p>
                                      <p
                                        className={`text-sm ${
                                          data.change >= 0
                                            ? "text-rabbit-success"
                                            : "text-rabbit-error"
                                        }`}
                                      >
                                        {data.change >= 0 ? "+" : ""}
                                        {data.change.toFixed(2)}%
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <ReferenceLine
                              y={firstPrice}
                              stroke="#6b7280"
                              strokeDasharray="3 3"
                            />
                            <Line
                              type="monotone"
                              dataKey="price"
                              stroke={priceChange >= 0 ? "#10b981" : "#ef4444"}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        {!hoveredPoint && (
                          <div className="mt-4 text-center">
                            <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Hover over the chart to see news and Reddit discussions from specific time periods
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Hovered Time Content */}
                      {hoveredPoint && hoveredContent && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <div className="bg-rabbit-mint-500/10 border border-rabbit-mint-500/30 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-rabbit-mint-400 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-rabbit-mint-500 animate-pulse" />
                              {hoveredPoint.date} at {hoveredPoint.time}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                              Showing news and discussions from around this time period
                            </p>
                          </div>

                          {/* News at this time */}
                          {hoveredContent.news.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" />
                                  <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
                                </svg>
                                News ({hoveredContent.news.length})
                              </h4>
                              {hoveredContent.news.map((item, i) => (
                                <Card key={i} className="p-4 hover:border-rabbit-mint-500/30 transition-colors">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-1">
                                      <h5 className="text-sm font-semibold text-gray-200 mb-1 leading-tight">
                                        {item.headline}
                                      </h5>
                                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                        {item.summary}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span>{item.source}</span>
                                        <span>•</span>
                                        <span>{item.relatedTime}</span>
                                      </div>
                                    </div>
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-rabbit-mint-400 hover:text-rabbit-mint-300 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}

                          {/* Reddit at this time */}
                          {hoveredContent.reddit.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                </svg>
                                Reddit Discussions ({hoveredContent.reddit.length})
                              </h4>
                              {hoveredContent.reddit.map((post, i) => (
                                <Card key={i} className="p-4 hover:border-rabbit-mint-500/30 transition-colors">
                                  <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center bg-rabbit-mint-500/10 rounded-lg px-2 py-1">
                                      <svg className="w-3 h-3 text-rabbit-mint-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" />
                                      </svg>
                                      <span className="text-xs font-bold text-rabbit-mint-400">
                                        {post.score}
                                      </span>
                                    </div>
                                    <div className="flex-1">
                                      <h5 className="text-sm font-medium text-gray-200 mb-1 leading-tight">
                                        {post.title}
                                      </h5>
                                      <p className="text-xs text-gray-600">
                                        r/wallstreetbets • {post.relatedTime}
                                      </p>
                                    </div>
                                    <a
                                      href={post.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-rabbit-mint-400 hover:text-rabbit-mint-300 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}

                          {hoveredContent.news.length === 0 &&
                            hoveredContent.reddit.length === 0 && (
                              <Card className="p-6 text-center">
                                <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm text-gray-500">
                                  No news or Reddit activity found around this time period
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Try hovering over different points on the chart
                                </p>
                              </Card>
                            )}
                        </motion.div>
                      )}

                      {/* Permanent News & Reddit Summary */}
                      <div className="space-y-6 mt-8">
                        <div className="bg-rabbit-card rounded-lg p-4 border border-rabbit-border mb-4">
                          <p className="text-xs text-gray-400 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Showing news and discussions from the last{' '}
                            <span className="font-semibold text-rabbit-mint-400">
                              {timeRange === '1D' ? '24 hours' : timeRange === '1W' ? '7 days' : timeRange === '1M' ? '30 days' : '90 days'}
                            </span>
                          </p>
                        </div>
                        <div className="border-t border-rabbit-border pt-6">
                          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-rabbit-mint-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" />
                              <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
                            </svg>
                            Recent News
                            {filteredNews.length > 0 && (
                              <span className="text-xs text-gray-500 font-normal">
                                ({filteredNews.length} {filteredNews.length === 1 ? 'article' : 'articles'})
                              </span>
                            )}
                          </h3>
                          {filteredNews.length > 0 ? (
                            <div className="space-y-3">
                              {filteredNews.slice(0, 5).map((item, i) => (
                                <Card key={i} className="p-4 hover:border-rabbit-mint-500/30 transition-colors">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-1">
                                      <h5 className="text-sm font-semibold text-gray-200 mb-1 leading-tight">
                                        {item.headline}
                                      </h5>
                                      <p className="text-xs text-gray-500 mb-2">
                                        {item.summary}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span>{item.source}</span>
                                        <span>•</span>
                                        <span>{item.relatedTime}</span>
                                      </div>
                                    </div>
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-rabbit-mint-400 hover:text-rabbit-mint-300 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <Card className="p-6 text-center">
                              <svg className="w-10 h-10 mx-auto text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                              </svg>
                              <p className="text-sm text-gray-500">
                                No news in the last {timeRange === '1D' ? '24 hours' : timeRange === '1W' ? '7 days' : timeRange === '1M' ? '30 days' : '90 days'}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">Try selecting a different time range</p>
                            </Card>
                          )}
                        </div>

                        <div className="border-t border-rabbit-border pt-6">
                          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-rabbit-mint-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                            </svg>
                            Reddit Discussions
                            {filteredReddit.length > 0 && (
                              <span className="text-xs text-gray-500 font-normal">
                                ({filteredReddit.length} {filteredReddit.length === 1 ? 'post' : 'posts'})
                              </span>
                            )}
                          </h3>
                          {filteredReddit.length > 0 ? (
                            <div className="space-y-3">
                              {filteredReddit.slice(0, 5).map((post, i) => (
                                <Card key={i} className="p-4 hover:border-rabbit-mint-500/30 transition-colors">
                                  <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center bg-rabbit-mint-500/10 rounded-lg px-2 py-1">
                                      <svg className="w-3 h-3 text-rabbit-mint-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" />
                                      </svg>
                                      <span className="text-xs font-bold text-rabbit-mint-400">
                                        {post.score}
                                      </span>
                                    </div>
                                    <div className="flex-1">
                                      <h5 className="text-sm font-medium text-gray-200 mb-1 leading-tight">
                                        {post.title}
                                      </h5>
                                      <p className="text-xs text-gray-600">
                                        r/wallstreetbets • {post.relatedTime}
                                      </p>
                                    </div>
                                    <a
                                      href={post.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-rabbit-mint-400 hover:text-rabbit-mint-300 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <Card className="p-6 text-center">
                              <svg className="w-10 h-10 mx-auto text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <p className="text-sm text-gray-500">
                                No Reddit posts in the last {timeRange === '1D' ? '24 hours' : timeRange === '1W' ? '7 days' : timeRange === '1M' ? '30 days' : '90 days'}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">Try selecting a different time range</p>
                            </Card>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "news" && (
                    <div className="space-y-3">
                      {newsItems.length > 0 ? (
                        newsItems.map((item, i) => (
                          <Card key={i} className="p-5">
                            <h3 className="text-base font-semibold text-gray-100 mb-2">
                              {item.headline}
                            </h3>
                            <p className="text-sm text-gray-400 mb-3">
                              {item.summary}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-600">
                                {item.source} • {item.relatedTime}
                              </p>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300"
                              >
                                Read more →
                              </a>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-10">
                          No recent news available
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === "reddit" && (
                    <div className="space-y-3">
                      {redditPosts.length > 0 ? (
                        redditPosts.map((post, i) => (
                          <Card key={i} className="p-5">
                            <div className="flex items-start gap-4">
                              <div className="flex flex-col items-center">
                                <span className="text-lg font-bold text-rabbit-mint-400">
                                  {post.score}
                                </span>
                                <span className="text-xs text-gray-600">votes</span>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-100 mb-2">
                                  {post.title}
                                </h3>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-600">
                                    {post.relatedTime}
                                  </p>
                                  <a
                                    href={post.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300"
                                  >
                                    View on Reddit →
                                  </a>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-10">
                          No recent Reddit posts available
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
