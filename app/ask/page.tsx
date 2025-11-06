"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import React from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import AudioPlayer from "@/components/AudioPlayer";

interface Message {
  role: "user" | "assistant";
  content: string;
  voiceNotes?: string[];
  time: string;
  createdAt?: string; // ISO timestamp for sorting
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

// Helper to parse time strings like "10:08 AM" for sorting
function parseTimeString(timeStr: string): number {
  const today = new Date();
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);

  let hour24 = hours;
  if (period === 'PM' && hours !== 12) hour24 += 12;
  if (period === 'AM' && hours === 12) hour24 = 0;

  today.setHours(hour24, minutes, 0, 0);
  return today.getTime();
}

export default function Ask() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [voiceNoteMode, setVoiceNoteMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load in-app notifications and chat history on mount
  useEffect(() => {
    const userId = 'cmh503gjd00008okpn9ic7cia'; // TODO: Get from auth

    const loadNotifications = async () => {
      try {
        // Load system notifications from database
        const response = await fetch(`/api/notifications/in-app?userId=${userId}`);
        const data = await response.json();

        let allMessages: Message[] = [];

        // Load chat history from localStorage
        const savedChat = localStorage.getItem('wealthyrabbit-chat');
        if (savedChat) {
          try {
            const chatHistory = JSON.parse(savedChat);
            allMessages = chatHistory;
          } catch (e) {
            console.error('Failed to parse chat history:', e);
          }
        }

        // Append system notifications (these have IDs)
        if (data.success && data.notifications) {
          allMessages = [...allMessages, ...data.notifications];
        }

        // Sort all messages by timestamp (parse time string to sort chronologically)
        allMessages.sort((a, b) => {
          // Use createdAt ISO string for system notifications, or parse time string for chat
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : parseTimeString(a.time);
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : parseTimeString(b.time);
          return timeA - timeB;
        });

        setMessages(allMessages);
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

  // Save chat messages to localStorage whenever they change
  useEffect(() => {
    // Only save chat messages (ones without IDs - system notifications have IDs)
    const chatMessages = messages.filter(msg => !msg.id);
    if (chatMessages.length > 0) {
      localStorage.setItem('wealthyrabbit-chat', JSON.stringify(chatMessages));
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const clearChat = () => {
    // Only clear chat messages, keep system notifications
    const systemNotifications = messages.filter(msg => msg.id);
    setMessages(systemNotifications);
    localStorage.removeItem('wealthyrabbit-chat');
  };

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
          requestVoiceNote: voiceNoteMode, // Pass voice note preference
        }),
      });

      const data = await response.json();

      if (response.ok && data.message) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
          voiceNotes: data.voiceNote ? [data.voiceNote] : undefined,
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
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-gray-100">
            Ask Your Rabbit
          </h1>
          {messages.filter(msg => !msg.id).length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-rabbit-mint-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-rabbit-card"
            >
              Clear Chat
            </button>
          )}
        </div>
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

                {/* Voice Notes or Text Content */}
                {message.voiceNotes && message.voiceNotes.length > 0 ? (
                  <div className="space-y-2 w-full">
                    {message.voiceNotes.map((url, i) => (
                      <AudioPlayer
                        key={i}
                        url={url}
                        audioId={`audio-${index}-${i}`}
                      />
                    ))}
                  </div>
                ) : (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.08 + 0.2 }}
                    className="text-sm text-gray-200 leading-relaxed whitespace-pre-line"
                  >
                    {message.content}
                  </motion.p>
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
          {/* Voice Note Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setVoiceNoteMode(!voiceNoteMode)}
            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
              voiceNoteMode
                ? 'bg-rabbit-mint-500/20 text-rabbit-mint-400'
                : 'text-gray-500 hover:text-gray-400'
            }`}
            title={voiceNoteMode ? 'Voice notes enabled' : 'Click for voice responses'}
            aria-label="Toggle voice note mode"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </motion.button>

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

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-600">
            Rabbit explains markets, not financial advice
          </p>
          {voiceNoteMode && (
            <motion.p
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-rabbit-mint-400"
            >
              🎤 Voice mode
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
