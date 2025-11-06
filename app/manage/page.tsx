"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function Manage() {
  const userId = "cmh503gjd00008okpn9ic7cia"; // Hardcoded test user ID
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSMS, setTestingSMS] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sendingBriefing, setSendingBriefing] = useState(false);
  const [briefingResult, setBriefingResult] = useState<{ success: boolean; message: string } | null>(null);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [notificationMode, setNotificationMode] = useState<"calm" | "balanced" | "active">("balanced");
  const [channels, setChannels] = useState({
    inApp: true,
    telegram: false,
    email: true,
  });

  const [topics, setTopics] = useState({
    news: true,
    reddit: true,
    expertOpinions: false,
    friendActivity: true,
    portfolioAlerts: true,
  });

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch(`/api/notifications/settings?userId=${userId}`);
        const data = await response.json();

        if (data.settings) {
          setNotificationMode(data.settings.mode as "calm" | "balanced" | "active");
          setChannels({
            inApp: data.settings.inApp,
            telegram: data.settings.telegram,
            email: data.settings.email,
          });
          setTopics({
            news: data.settings.news,
            reddit: data.settings.reddit,
            expertOpinions: data.settings.expertOpinions,
            friendActivity: data.settings.friendActivity,
            portfolioAlerts: data.settings.portfolioAlerts,
          });
        }
        setTelegramChatId(data.telegramChatId || "");
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    if (loading) return; // Don't save on initial load

    async function saveSettings() {
      setSaving(true);
      try {
        await fetch('/api/notifications/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            mode: notificationMode,
            channels,
            topics,
            telegramChatId,
          }),
        });
      } catch (error) {
        console.error('Error saving settings:', error);
      } finally {
        setSaving(false);
      }
    }

    const timeoutId = setTimeout(saveSettings, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [notificationMode, channels, topics, telegramChatId, loading]);

  // Test WhatsApp notification
  const sendTestNotification = async () => {
    setTestingSMS(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Test message sent! Check your WhatsApp.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to send test message',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setTestingSMS(false);
      // Clear message after 5 seconds
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  // Check for interesting events (abnormal event detection)
  const sendBriefingNow = async () => {
    setSendingBriefing(true);
    setBriefingResult(null);

    try {
      const response = await fetch('/api/briefing/events-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setBriefingResult({
          success: true,
          message: data.message || 'Events check sent to Telegram!',
        });
      } else {
        setBriefingResult({
          success: false,
          message: data.error || 'Failed to check events',
        });
      }
    } catch (error) {
      setBriefingResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setSendingBriefing(false);
      // Clear message after 5 seconds
      setTimeout(() => setBriefingResult(null), 5000);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-gray-400">Loading settings...</div>
      </div>
    );
  }

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

      {/* What's Interesting? */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-rabbit-card rounded-2xl p-6 border border-rabbit-border"
      >
        <div className="flex items-start gap-4 mb-4">
          <span className="text-3xl">🔍</span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-100 mb-1">
              What's Interesting?
            </h3>
            <p className="text-sm text-gray-400">
              Force-check for unusual events right now — big price moves, news surges, sentiment flips.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Only sends if something abnormal is happening. Otherwise tells you markets are quiet.
            </p>
          </div>
        </div>

        <button
          onClick={sendBriefingNow}
          disabled={sendingBriefing || !telegramChatId}
          className="w-full px-6 py-3 bg-rabbit-mint-500 hover:bg-rabbit-mint-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          {sendingBriefing ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Check for Interesting Events
            </>
          )}
        </button>

        {!telegramChatId && (
          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-xs text-yellow-400">
              ⚠️  Link your Telegram account below to use this feature
            </p>
          </div>
        )}

        {briefingResult && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              briefingResult.success
                ? 'bg-rabbit-mint-500/10 border border-rabbit-mint-500/30 text-rabbit-mint-400'
                : 'bg-rabbit-error/10 border border-rabbit-error/30 text-rabbit-error'
            }`}
          >
            {briefingResult.message}
          </div>
        )}
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
              <p className="text-sm font-medium text-gray-200">Telegram</p>
              <p className="text-xs text-gray-500">Instant alerts via Telegram</p>
            </div>

            <button
              onClick={() => setChannels({ ...channels, telegram: !channels.telegram })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                channels.telegram ? "bg-rabbit-mint-500" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  channels.telegram ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          {channels.telegram && (
            <div className="pt-2 space-y-3">
              {!telegramChatId ? (
                <div className="bg-rabbit-dark/50 border border-rabbit-border rounded-lg p-4 space-y-3">
                  <div className="text-center">
                    <span className="text-3xl block mb-2">📱</span>
                    <p className="text-sm font-medium text-gray-200 mb-1">
                      Connect Telegram
                    </p>
                    <p className="text-xs text-gray-400">
                      Get instant stock alerts on your phone
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-300">Step 1: Get your Chat ID</p>
                    <a
                      href="https://t.me/WealthyRabbit_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 py-2.5 bg-rabbit-mint-500 hover:bg-rabbit-mint-600 rounded-lg text-white text-sm font-medium transition-colors text-center"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.84 8.673c-.138.633-.5.784-.997.488l-2.755-2.03-1.33 1.279c-.147.147-.27.27-.554.27l.197-2.8 5.09-4.6c.22-.197-.048-.308-.342-.11l-6.29 3.96-2.71-.844c-.59-.185-.602-.59.124-.875l10.595-4.086c.492-.185.922.11.762.874z"/>
                        </svg>
                        Open Bot & Send /start
                      </div>
                    </a>
                    <p className="text-[11px] text-gray-500">
                      The bot will send you your Chat ID
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-300">Step 2: Enter your Chat ID</p>
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="Paste your Chat ID here"
                      className="w-full px-3 py-2 bg-rabbit-dark border border-rabbit-border focus:border-rabbit-mint-500 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none transition-all"
                    />
                    <p className="text-[11px] text-gray-500">
                      Settings auto-save as you type
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-rabbit-mint-500/10 border border-rabbit-mint-500/30 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <p className="text-xs text-rabbit-mint-400 font-medium">
                        Telegram Connected
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Chat ID: {telegramChatId}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={sendTestNotification}
                      disabled={testingSMS}
                      className="w-full px-4 py-2 bg-rabbit-mint-500 hover:bg-rabbit-mint-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      {testingSMS ? 'Sending...' : 'Send Test Message'}
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('Disconnect Telegram? You can reconnect anytime.')) {
                          setTelegramChatId('');
                        }
                      }}
                      className="w-full px-4 py-2 bg-rabbit-dark border border-rabbit-border hover:border-rabbit-error/50 hover:bg-rabbit-error/10 rounded-lg text-gray-300 hover:text-rabbit-error text-sm font-medium transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`mt-2 p-2 rounded-lg text-xs ${
                        testResult.success
                          ? 'bg-rabbit-mint-500/10 border border-rabbit-mint-500/30 text-rabbit-mint-400'
                          : 'bg-rabbit-error/10 border border-rabbit-error/30 text-rabbit-error'
                      }`}
                    >
                      {testResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

      {/* Save status message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center py-6"
      >
        <p className="text-sm text-gray-500">
          {saving ? '💾 Saving...' : '🐇 Changes save automatically'}
        </p>
      </motion.div>
    </div>
  );
}
