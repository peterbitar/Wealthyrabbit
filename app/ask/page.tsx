"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";

interface Message {
  role: "user" | "assistant";
  content: string;
  voiceNotes?: string[];
  time: string;
  id?: string;
  read?: boolean;
}

const quickQuestions = [
  "What's moving markets today?",
  "Explain the Fed's latest decision",
  "Is now a good time to buy?",
  "Summarize today's big moves",
];

function getTimeString() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function Ask() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load in-app notifications on mount
  useEffect(() => {
    const userId = 'cmh503gjd00008okpn9ic7cia'; // TODO: Get from auth

    const loadNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications/in-app?userId=${userId}`);
        const data = await response.json();

        if (data.success && data.notifications) {
          setMessages(data.notifications);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    const markAsRead = async () => {
      try {
        await fetch('/api/notifications/in-app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    };

    loadNotifications();

    // Mark all as read after a short delay (user has seen them)
    const timer = setTimeout(() => {
      markAsRead();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: messageText,
      time: getTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: messages,
        }),
      });

      const data = await response.json();

      if (response.ok && data.message) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
          time: getTimeString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I had trouble processing that. Can you try again?",
        time: getTimeString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 pt-4 border-b border-rabbit-border/50"
      >
        <h1 className="text-2xl font-semibold text-gray-100 mb-1">
          Ask Your Rabbit
        </h1>
        <p className="text-sm text-gray-400">
          Markets explained in plain language
        </p>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                delay: index * 0.08
              }}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? "bg-rabbit-mint-500/20 border-rabbit-mint-500/30"
                    : "bg-rabbit-card border-rabbit-border"
                } border rounded-2xl p-4 shadow-lg`}
              >
                {message.role === "assistant" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.08 + 0.1 }}
                    className="flex items-center gap-2 mb-2"
                  >
                    <div className="w-6 h-6 bg-rabbit-lavender-500/20 rounded-full flex items-center justify-center text-sm animate-pulse">
                      🐇
                    </div>
                    <span className="text-xs font-medium text-rabbit-lavender-300">
                      Rabbit
                    </span>
                  </motion.div>
                )}

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.08 + 0.2 }}
                  className="text-sm text-gray-200 leading-relaxed whitespace-pre-line"
                >
                  {message.content}
                </motion.p>

                {/* Voice Notes */}
                {message.voiceNotes && message.voiceNotes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.voiceNotes.map((url, i) => (
                      <audio
                        key={i}
                        controls
                        className="w-full h-10"
                        preload="metadata"
                      >
                        <source src={url} type="audio/ogg" />
                        Your browser does not support audio playback.
                      </audio>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-600 mt-2">{message.time}</p>
              </motion.div>
            </motion.div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="bg-rabbit-card border border-rabbit-border rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-rabbit-lavender-500/20 rounded-full flex items-center justify-center text-sm">
                    🐇
                  </div>
                  <span className="text-xs font-medium text-rabbit-lavender-300">
                    Rabbit is typing...
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                      className="w-2 h-2 bg-rabbit-lavender-400 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />

        {/* Quick Questions - Horizontal Scroll */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-2"
          >
            <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {quickQuestions.map((question, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                onClick={() => sendMessage(question)}
                className="text-xs px-4 py-2.5 bg-rabbit-card border border-rabbit-border rounded-full text-gray-300 hover:border-rabbit-lavender-500/50 hover:text-rabbit-lavender-300 transition-all hover:shadow-md hover:shadow-rabbit-lavender-500/10 flex-shrink-0 whitespace-nowrap"
              >
                {question}
              </motion.button>
            ))}
          </div>
        </motion.div>
        )}
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-4 border-t border-rabbit-border/50"
      >
        <div className="flex items-center gap-3 bg-rabbit-card border border-rabbit-border rounded-2xl p-3 focus-within:border-rabbit-lavender-500/50 transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim()) {
                sendMessage(inputValue);
              }
            }}
            placeholder="Ask anything about markets..."
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
            aria-label="Ask a question"
          />

          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => sendMessage(inputValue)}
            disabled={isTyping || !inputValue.trim()}
            className="w-8 h-8 bg-rabbit-lavender-500 rounded-full flex items-center justify-center hover:bg-rabbit-lavender-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-lg shadow-rabbit-lavender-500/30 disabled:shadow-none"
            aria-label="Send message"
          >
            <motion.svg
              whileHover={{ x: 2, y: -2 }}
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
            </motion.svg>
          </motion.button>
        </div>

        <p className="text-xs text-gray-600 text-center mt-3">
          Rabbit explains markets, not financial advice
        </p>
      </motion.div>
    </div>
  );
}
