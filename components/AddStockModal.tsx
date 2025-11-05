"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";

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
  const [success, setSuccess] = useState(false);

  // For holdings only
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");

  // Validation states
  const [symbolError, setSymbolError] = useState("");
  const [sharesError, setSharesError] = useState("");
  const [priceError, setPriceError] = useState("");

  const validateInputs = () => {
    let isValid = true;
    setSymbolError("");
    setSharesError("");
    setPriceError("");

    if (!symbol.trim()) {
      setSymbolError("Please enter a stock symbol");
      isValid = false;
    }

    if (mode === "holding") {
      const sharesNum = parseFloat(shares);
      if (!shares || isNaN(sharesNum) || sharesNum <= 0) {
        setSharesError("Please enter a valid number of shares");
        isValid = false;
      }

      const priceNum = parseFloat(avgPrice);
      if (!avgPrice || isNaN(priceNum) || priceNum <= 0) {
        setPriceError("Please enter a valid price");
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateInputs()) {
      return;
    }

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

      // Success - show success state briefly
      setSuccess(true);
      setSymbol("");
      setShares("");
      setAvgPrice("");

      setTimeout(() => {
        onAdd();
        onClose();
        setSuccess(false);
      }, 1000);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="w-full max-w-md"
              whileHover={{ scale: 1.01 }}
            >
              <div className="bg-rabbit-card border border-rabbit-border rounded-3xl p-6 shadow-2xl shadow-rabbit-mint-500/10">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between mb-4"
              >
                <h2 className="text-xl font-semibold text-gray-100">
                  {mode === "holding" ? "Add Stock to Portfolio" : "Add to Watchlist"}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-rabbit-border/50 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </motion.div>

              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <motion.div
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stock Symbol
                  </label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value.toUpperCase());
                      setSymbolError("");
                    }}
                    placeholder="e.g., AAPL"
                    className={`w-full px-4 py-3 bg-rabbit-dark border ${
                      symbolError ? 'border-rabbit-error' : 'border-rabbit-border focus:border-rabbit-mint-500'
                    } rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none transition-all`}
                    required
                    aria-label="Stock symbol"
                    aria-invalid={!!symbolError}
                  />
                  <AnimatePresence>
                    {symbolError && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-rabbit-error mt-1"
                      >
                        {symbolError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {mode === "holding" && (
                  <>
                    <motion.div
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Number of Shares
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={shares}
                        onChange={(e) => {
                          setShares(e.target.value);
                          setSharesError("");
                        }}
                        placeholder="e.g., 10"
                        className={`w-full px-4 py-3 bg-rabbit-dark border ${
                          sharesError ? 'border-rabbit-error' : 'border-rabbit-border focus:border-rabbit-mint-500'
                        } rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none transition-all`}
                        required
                        aria-label="Number of shares"
                        aria-invalid={!!sharesError}
                      />
                      <AnimatePresence>
                        {sharesError && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-xs text-rabbit-error mt-1"
                          >
                            {sharesError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.div
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.35 }}
                    >
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Average Purchase Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={avgPrice}
                        onChange={(e) => {
                          setAvgPrice(e.target.value);
                          setPriceError("");
                        }}
                        placeholder="e.g., 150.50"
                        className={`w-full px-4 py-3 bg-rabbit-dark border ${
                          priceError ? 'border-rabbit-error' : 'border-rabbit-border focus:border-rabbit-mint-500'
                        } rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none transition-all`}
                        required
                        aria-label="Average purchase price"
                        aria-invalid={!!priceError}
                      />
                      <AnimatePresence>
                        {priceError && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-xs text-rabbit-error mt-1"
                          >
                            {priceError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </>
                )}

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-rabbit-error/10 border border-rabbit-error/30 rounded-xl"
                    >
                      <p className="text-sm text-rabbit-error">{error}</p>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-rabbit-success/10 border border-rabbit-success/30 rounded-xl flex items-center gap-2"
                    >
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 15 }}
                        className="text-lg"
                      >
                        ✓
                      </motion.span>
                      <p className="text-sm text-rabbit-success font-medium">Stock added successfully!</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3 pt-2"
                >
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="ghost"
                    fullWidth
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || success}
                    variant="primary"
                    fullWidth
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </span>
                    ) : success ? (
                      "Added!"
                    ) : (
                      "Add Stock"
                    )}
                  </Button>
                </motion.div>
              </motion.form>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
