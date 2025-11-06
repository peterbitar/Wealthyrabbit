"use client";

import { motion } from "framer-motion";
import Button from "@/components/Button";

export default function ConnectTelegram() {
  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-rabbit-card border border-rabbit-border rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
              className="w-24 h-24 bg-gradient-to-br from-rabbit-mint-500 to-rabbit-lavender-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <span className="text-5xl">🐇</span>
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-100 mb-3">
              Connect to Telegram
            </h1>
            <p className="text-base text-gray-400">
              Get instant stock alerts and market updates right in your pocket
            </p>
          </div>

          {/* Features */}
          <div className="bg-rabbit-dark/50 rounded-2xl p-6 mb-8 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              You'll Get
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rabbit-mint-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📊</span>
                </div>
                <div>
                  <p className="font-medium text-gray-200 text-sm">Real-time Price Alerts</p>
                  <p className="text-xs text-gray-500">Instant notifications for big moves in your portfolio</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rabbit-lavender-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📰</span>
                </div>
                <div>
                  <p className="font-medium text-gray-200 text-sm">Breaking News</p>
                  <p className="text-xs text-gray-500">Important updates about stocks you own</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rabbit-mint-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🎯</span>
                </div>
                <div>
                  <p className="font-medium text-gray-200 text-sm">Daily Summaries</p>
                  <p className="text-xs text-gray-500">Your portfolio performance, delivered daily</p>
                </div>
              </div>
            </div>
          </div>

          {/* Simple Instructions */}
          <div className="bg-gradient-to-br from-rabbit-mint-500/10 to-rabbit-lavender-500/10 rounded-2xl p-6 mb-6 border border-rabbit-mint-500/20">
            <p className="text-sm text-gray-300 text-center mb-4">
              Click the button below to open the WealthyRabbit bot in Telegram
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>1. Click button</span>
              <span>→</span>
              <span>2. Press "Start"</span>
              <span>→</span>
              <span>3. Done! 🎉</span>
            </div>
          </div>

          {/* Main CTA */}
          <a
            href="https://t.me/WealthyRabbit_bot?start=connect"
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-4"
          >
            <Button variant="primary" fullWidth>
              <div className="flex items-center justify-center gap-3 py-1">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.84 8.673c-.138.633-.5.784-.997.488l-2.755-2.03-1.33 1.279c-.147.147-.27.27-.554.27l.197-2.8 5.09-4.6c.22-.197-.048-.308-.342-.11l-6.29 3.96-2.71-.844c-.59-.185-.602-.59.124-.875l10.595-4.086c.492-.185.922.11.762.874z"/>
                </svg>
                <span className="font-semibold text-lg">Open WealthyRabbit Bot</span>
              </div>
            </Button>
          </a>

          <a href="/portfolio">
            <Button variant="ghost" fullWidth>
              I'll do this later
            </Button>
          </a>
        </div>

        {/* Additional Help */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center space-y-2"
        >
          <p className="text-xs text-gray-500">
            Don't have Telegram? <a href="https://telegram.org" target="_blank" rel="noopener noreferrer" className="text-rabbit-mint-400 hover:text-rabbit-mint-300 underline">Download it here</a>
          </p>
          <p className="text-xs text-gray-600">
            Your notifications will start appearing once you add stocks to your portfolio
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
