"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import FilterChips from "@/components/FilterChips";
import AddStockModal from "@/components/AddStockModal";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorState from "@/components/ErrorState";
import Toast from "@/components/Toast";
import EmptyState from "@/components/EmptyState";
import Card from "@/components/Card";
import Button from "@/components/Button";
import HorizontalScroll from "@/components/HorizontalScroll";
import CollapsibleSection from "@/components/CollapsibleSection";
import SeeAllButton from "@/components/SeeAllButton";
import Sparkline from "@/components/Sparkline";
import PercentageBadge from "@/components/PercentageBadge";
import Tabs from "@/components/Tabs";
import StockDetailModal from "@/components/StockDetailModal";

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState("holdings");
  const [holdingsFilter, setHoldingsFilter] = useState("All");
  const [watchlistFilter, setWatchlistFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showAddWatchlist, setShowAddWatchlist] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' | 'info' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const [showAllWatchlist, setShowAllWatchlist] = useState(false);

  const MAX_HOLDINGS_DISPLAY = 5;
  const MAX_WATCHLIST_DISPLAY = 5;

  // Hardcoded test user ID (in production, get from auth)
  const userId = "cmh503gjd00008okpn9ic7cia";

  const fetchPortfolio = async () => {
    try {
      setError(false);
      const response = await fetch(`/api/portfolio/summary?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch portfolio');
      const data = await response.json();
      setPortfolioData(data);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setError(true);
      setToast({ show: true, message: 'Failed to load portfolio', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Delete holding
  const deleteHolding = async (holdingId: string) => {
    setDeletingId(holdingId);
    try {
      const response = await fetch(`/api/portfolio/holdings?id=${holdingId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        showToast('Stock removed from portfolio', 'success');
        await fetchPortfolio();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting holding:', error);
      showToast('Failed to remove stock', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Delete from watchlist
  const deleteFromWatchlist = async (watchlistId: string) => {
    setDeletingId(watchlistId);
    try {
      const response = await fetch(`/api/portfolio/watchlist?id=${watchlistId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        showToast('Stock removed from watchlist', 'success');
        await fetchPortfolio();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      showToast('Failed to remove stock', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 space-y-6">
        <div className="pt-4">
          <LoadingSkeleton variant="text" className="w-48 h-8 mb-2" count={1} />
          <LoadingSkeleton variant="text" className="w-32 h-4" count={1} />
        </div>
        <LoadingSkeleton variant="card" className="h-40" count={1} />
        <LoadingSkeleton variant="card" className="h-24" count={1} />
        <div className="space-y-3">
          <LoadingSkeleton variant="card" className="h-32" count={3} />
        </div>
      </div>
    );
  }

  if (error || !portfolioData) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <ErrorState
          message="We couldn't load your portfolio. Please check your connection and try again."
          onRetry={fetchPortfolio}
        />
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
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />
      <div className="min-h-screen p-4 space-y-4 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-2"
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

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between gap-2"
      >
        <Tabs
          tabs={[
            { id: "holdings", label: "Holdings", count: filteredHoldings.length },
            { id: "watchlist", label: "Watchlist", count: filteredWatchlist.length },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </motion.div>

      {/* Tab Content */}
      <div>
        {activeTab === "holdings" ? (
          <>
            {/* Holdings Filters and Actions */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <FilterChips
                filters={["All", "Winning", "Losing", "Tech", "Finance"]}
                activeFilter={holdingsFilter}
                onFilterChange={setHoldingsFilter}
              />
              <button
                onClick={() => setShowAddHolding(true)}
                className="flex items-center gap-1 text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Stock
              </button>
            </div>

        {filteredHoldings.length === 0 ? (
          <EmptyState
            emoji="📊"
            title="No holdings yet"
            description="Add your first stock to start tracking your portfolio and get personalized insights."
            actionLabel="Add Stock"
            onAction={() => setShowAddHolding(true)}
          />
        ) : (
          <>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {(showAllHoldings ? filteredHoldings : filteredHoldings.slice(0, MAX_HOLDINGS_DISPLAY)).map((stock: any, index: number) => (
            <motion.div
              key={stock.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2, scale: 1.005 }}
              onClick={() => {
                console.log('Stock card clicked:', stock.symbol, stock.name);
                setSelectedStock({ symbol: stock.symbol, name: stock.name });
              }}
              className="bg-rabbit-card rounded-2xl p-5 border border-rabbit-border hover:border-rabbit-mint-500/30 transition-all shadow-md shadow-black/10 hover:shadow-lg hover:shadow-rabbit-mint-500/10 cursor-pointer"
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
                  <Sparkline
                    color={stock.dayChange >= 0 ? "#10b981" : "#ef4444"}
                    width={70}
                    height={30}
                  />
                  <div className="text-right">
                    <p className="font-semibold text-gray-100">
                      ${stock.totalValue.toLocaleString()}
                    </p>
                    <PercentageBadge value={stock.dayChange} size="sm" />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHolding(stock.id);
                    }}
                    disabled={deletingId === stock.id}
                    className="p-2 hover:bg-rabbit-error/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove from portfolio"
                    aria-label="Remove stock from portfolio"
                  >
                    {deletingId === stock.id ? (
                      <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-gray-500 hover:text-rabbit-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </motion.button>
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
              </AnimatePresence>
            </div>
            {filteredHoldings.length > MAX_HOLDINGS_DISPLAY && !showAllHoldings && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-center"
              >
                <SeeAllButton
                  count={filteredHoldings.length - MAX_HOLDINGS_DISPLAY}
                  onClick={() => setShowAllHoldings(true)}
                />
              </motion.div>
            )}
          </>
        )}
          </>
        ) : (
          <>
            {/* Watchlist Filters and Actions */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <FilterChips
                filters={["All", "High Priority", "Tech", "Finance"]}
                activeFilter={watchlistFilter}
                onFilterChange={setWatchlistFilter}
              />
              <button
                onClick={() => setShowAddWatchlist(true)}
                className="flex items-center gap-1 text-xs text-rabbit-mint-400 hover:text-rabbit-mint-300 font-medium flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Stock
              </button>
            </div>

            {/* Watchlist Content */}
            {filteredWatchlist.length === 0 ? (
              <EmptyState
                emoji="👀"
                title="Your watchlist is empty"
                description="Add stocks you're interested in to keep track of their performance."
                actionLabel="Add Stock"
                onAction={() => setShowAddWatchlist(true)}
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredWatchlist.map((stock: any, index: number) => (
                    <motion.div
                      key={stock.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -2, scale: 1.005 }}
                      onClick={() => {
                console.log('Stock card clicked:', stock.symbol, stock.name);
                setSelectedStock({ symbol: stock.symbol, name: stock.name });
              }}
                      className="bg-rabbit-card rounded-2xl p-5 border border-rabbit-border hover:border-rabbit-mint-500/30 transition-all shadow-md shadow-black/10 hover:shadow-lg hover:shadow-rabbit-mint-500/10 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
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
                          <Sparkline
                            color={stock.dayChange >= 0 ? "#10b981" : "#ef4444"}
                            width={70}
                            height={30}
                          />
                          <div className="text-right">
                            <p className="font-semibold text-gray-100">
                              ${stock.currentPrice.toFixed(2)}
                            </p>
                            <PercentageBadge value={stock.dayChange} size="sm" />
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFromWatchlist(stock.id);
                            }}
                            disabled={deletingId === stock.id}
                            className="p-2 hover:bg-rabbit-error/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove from watchlist"
                            aria-label="Remove stock from watchlist"
                          >
                            {deletingId === stock.id ? (
                              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4 text-gray-500 hover:text-rabbit-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

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
      {selectedStock && (
        <>
          {console.log('Rendering modal for:', selectedStock)}
          <StockDetailModal
            isOpen={true}
            onClose={() => setSelectedStock(null)}
            symbol={selectedStock.symbol}
            name={selectedStock.name}
          />
        </>
      )}
      </div>
    </>
  );
}
