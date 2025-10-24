"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function Manage() {
  const [notificationMode, setNotificationMode] = useState<"calm" | "balanced" | "active">("balanced");
  const [channels, setChannels] = useState({
    inApp: true,
    whatsapp: false,
    email: true,
  });

  const [topics, setTopics] = useState({
    news: true,
    reddit: true,
    expertOpinions: false,
    friendActivity: true,
    portfolioAlerts: true,
  });

  const modes = [
    {
      id: "calm" as const,
      icon: "💤",
      name: "Calm",
      description: "Major events only",
      example: "Earnings reports, significant price moves (±5%)",
    },
    {
      id: "balanced" as const,
      icon: "🌤️",
      name: "Balanced",
      description: "Daily summaries + key insights",
      example: "Morning digest, important news, portfolio updates",
    },
    {
      id: "active" as const,
      icon: "⚡",
      name: "Active",
      description: "Full awareness",
      example: "Real-time alerts, trending stocks, friend activity",
    },
  ];

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-4"
      >
        <h1 className="text-2xl font-semibold text-gray-100 mb-1">
          Manage
        </h1>
        <p className="text-sm text-gray-400">
          Control how much the app talks to you
        </p>
      </motion.div>

      {/* Notification Mode */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200 mb-3">
          Notification Mode
        </h2>

        <div className="space-y-3">
          {modes.map((mode, index) => (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setNotificationMode(mode.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                notificationMode === mode.id
                  ? "bg-rabbit-mint-500/10 border-rabbit-mint-500/50"
                  : "bg-rabbit-card border-rabbit-border hover:border-rabbit-border/80"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{mode.icon}</span>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-100">{mode.name}</h3>
                    {notificationMode === mode.id && (
                      <div className="w-2 h-2 bg-rabbit-mint-400 rounded-full animate-breathe" />
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{mode.description}</p>
                  <p className="text-xs text-gray-500">{mode.example}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Delivery Channels */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold text-gray-200 mb-3">
          Delivery Channels
        </h2>

        <div className="bg-rabbit-card rounded-2xl border border-rabbit-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">In-App</p>
              <p className="text-xs text-gray-500">Notifications within the app</p>
            </div>

            <button
              onClick={() => setChannels({ ...channels, inApp: !channels.inApp })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                channels.inApp ? "bg-rabbit-mint-500" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  channels.inApp ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">WhatsApp</p>
              <p className="text-xs text-gray-500">Daily digest via WhatsApp</p>
            </div>

            <button
              onClick={() => setChannels({ ...channels, whatsapp: !channels.whatsapp })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                channels.whatsapp ? "bg-rabbit-mint-500" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  channels.whatsapp ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">Email</p>
              <p className="text-xs text-gray-500">Weekly market summary</p>
            </div>

            <button
              onClick={() => setChannels({ ...channels, email: !channels.email })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                channels.email ? "bg-rabbit-mint-500" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  channels.email ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Topics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-gray-200 mb-3">
          What to Track
        </h2>

        <div className="bg-rabbit-card rounded-2xl border border-rabbit-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">News</p>
              <p className="text-xs text-gray-500">Real-time market news</p>
            </div>
            <input
              type="checkbox"
              checked={topics.news}
              onChange={() => setTopics({ ...topics, news: !topics.news })}
              className="w-5 h-5 rounded border-2 border-gray-600 bg-transparent checked:bg-rabbit-mint-500 checked:border-rabbit-mint-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">Reddit Sentiment</p>
              <p className="text-xs text-gray-500">Social buzz & trends</p>
            </div>
            <input
              type="checkbox"
              checked={topics.reddit}
              onChange={() => setTopics({ ...topics, reddit: !topics.reddit })}
              className="w-5 h-5 rounded border-2 border-gray-600 bg-transparent checked:bg-rabbit-mint-500 checked:border-rabbit-mint-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">Expert Opinions</p>
              <p className="text-xs text-gray-500">Takes from pro investors</p>
            </div>
            <input
              type="checkbox"
              checked={topics.expertOpinions}
              onChange={() => setTopics({ ...topics, expertOpinions: !topics.expertOpinions })}
              className="w-5 h-5 rounded border-2 border-gray-600 bg-transparent checked:bg-rabbit-mint-500 checked:border-rabbit-mint-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">Friend Activity</p>
              <p className="text-xs text-gray-500">What your circle is watching</p>
            </div>
            <input
              type="checkbox"
              checked={topics.friendActivity}
              onChange={() => setTopics({ ...topics, friendActivity: !topics.friendActivity })}
              className="w-5 h-5 rounded border-2 border-gray-600 bg-transparent checked:bg-rabbit-mint-500 checked:border-rabbit-mint-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">Portfolio Alerts</p>
              <p className="text-xs text-gray-500">Significant price moves</p>
            </div>
            <input
              type="checkbox"
              checked={topics.portfolioAlerts}
              onChange={() => setTopics({ ...topics, portfolioAlerts: !topics.portfolioAlerts })}
              className="w-5 h-5 rounded border-2 border-gray-600 bg-transparent checked:bg-rabbit-mint-500 checked:border-rabbit-mint-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Calm message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center py-6"
      >
        <p className="text-sm text-gray-500">
          🐇 Changes save automatically
        </p>
      </motion.div>
    </div>
  );
}
