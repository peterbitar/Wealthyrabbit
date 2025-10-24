"use client";

import { motion } from "framer-motion";
import { useState } from "react";

// Dummy conversation history
const dummyMessages = [
  {
    role: "user",
    content: "Why did Tesla drop today?",
    time: "2:45 PM",
  },
  {
    role: "assistant",
    content: "Tesla dipped 1.8% today, nothing dramatic. The main driver was profit-taking after yesterday's 3% rally. Also, there were some concerns about production numbers in China being slightly below estimates. \n\nBut here's the thing: this is just noise. The broader trend for TSLA is still intact - EV demand is solid, and Musk's focus on AI/robotics is keeping investors interested. Unless you're day trading, this pullback is barely a blip.",
    time: "2:45 PM",
  },
  {
    role: "user",
    content: "Should I be worried about my NVDA position?",
    time: "Yesterday",
  },
  {
    role: "assistant",
    content: "Not at all. NVDA is up 3.2% and the chip sector is on fire right now. The AI infrastructure build-out is real and accelerating.\n\nHistorically, when NVDA rallies like this on strong volume, it tends to consolidate for a bit before the next leg up. You're good. Just don't panic if we see a 5-10% pullback at some point - that's healthy and expected.",
    time: "Yesterday",
  },
];

const quickQuestions = [
  "What's moving markets today?",
  "Explain the Fed's latest decision",
  "Is now a good time to buy?",
  "Summarize today's big moves",
];

export default function Ask() {
  const [messages] = useState(dummyMessages);
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 pt-6 border-b border-rabbit-border/50"
      >
        <h1 className="text-2xl font-semibold text-gray-100 mb-1">
          Ask Your Rabbit
        </h1>
        <p className="text-sm text-gray-400">
          Markets explained in plain language
        </p>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] ${
                message.role === "user"
                  ? "bg-rabbit-mint-500/20 border-rabbit-mint-500/30"
                  : "bg-rabbit-card border-rabbit-border"
              } border rounded-2xl p-4`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-rabbit-lavender-500/20 rounded-full flex items-center justify-center text-sm">
                    🐇
                  </div>
                  <span className="text-xs font-medium text-rabbit-lavender-300">
                    Rabbit
                  </span>
                </div>
              )}

              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                {message.content}
              </p>

              <p className="text-xs text-gray-600 mt-2">{message.time}</p>
            </div>
          </motion.div>
        ))}

        {/* Quick Questions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="pt-4"
        >
          <p className="text-xs text-gray-500 mb-3">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                className="text-xs px-3 py-2 bg-rabbit-card border border-rabbit-border rounded-full text-gray-300 hover:border-rabbit-lavender-500/50 hover:text-rabbit-lavender-300 transition-all"
              >
                {question}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-rabbit-border/50">
        <div className="flex items-center gap-3 bg-rabbit-card border border-rabbit-border rounded-2xl p-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything about markets..."
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
          />

          <button className="w-8 h-8 bg-rabbit-lavender-500 rounded-full flex items-center justify-center hover:bg-rabbit-lavender-600 transition-colors flex-shrink-0">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center mt-3">
          Rabbit explains markets, not financial advice
        </p>
      </div>
    </div>
  );
}
