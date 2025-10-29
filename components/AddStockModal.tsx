"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  userId: string;
  mode: "holding" | "watchlist";
}

export default function AddStockModal({ isOpen, onClose, onAdd, userId, mode }: AddStockModalProps) {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // For holdings only
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Fetch stock info from Finnhub to get the name
      const quoteResponse = await fetch(`/api/stocks/quote?symbol=${symbol.toUpperCase()}`);
      if (!quoteResponse.ok) {
        throw new Error("Stock not found. Please check the symbol.");
      }
      const quoteData = await quoteResponse.json();

      if (mode === "holding") {
        // Add to holdings
        const response = await fetch("/api/portfolio/holdings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            symbol: symbol.toUpperCase(),
            name: quoteData.name,
            shares: parseFloat(shares),
            avgPrice: parseFloat(avgPrice),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to add holding");
        }
      } else {
        // Add to watchlist
        const response = await fetch("/api/portfolio/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            symbol: symbol.toUpperCase(),
            name: quoteData.name,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to add to watchlist");
        }
      }

      // Success - reset form and close
      setSymbol("");
      setShares("");
      setAvgPrice("");
      onAdd();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md">
              <div className="bg-rabbit-card border border-rabbit-border rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-100">
                  {mode === "holding" ? "Add Stock to Portfolio" : "Add to Watchlist"}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-rabbit-border/50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stock Symbol
                  </label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g., AAPL"
                    className="w-full px-4 py-3 bg-rabbit-dark border border-rabbit-border rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rabbit-mint-500 transition-colors"
                    required
                  />
                </div>

                {mode === "holding" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Number of Shares
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                        placeholder="e.g., 10"
                        className="w-full px-4 py-3 bg-rabbit-dark border border-rabbit-border rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rabbit-mint-500 transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Average Purchase Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={avgPrice}
                        onChange={(e) => setAvgPrice(e.target.value)}
                        placeholder="e.g., 150.50"
                        className="w-full px-4 py-3 bg-rabbit-dark border border-rabbit-border rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rabbit-mint-500 transition-colors"
                        required
                      />
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-3 bg-rabbit-error/10 border border-rabbit-error/30 rounded-xl">
                    <p className="text-sm text-rabbit-error">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 bg-rabbit-dark border border-rabbit-border rounded-xl text-gray-300 font-medium hover:bg-rabbit-border/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-rabbit-mint-500 rounded-xl text-white font-medium hover:bg-rabbit-mint-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Adding..." : "Add Stock"}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
