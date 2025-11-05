/**
 * WealthyRabbit Notification System
 *
 * Examples of how to use the friendly, conversational message generator
 */

import { generateMessage } from './abnormal-event-detector';

/**
 * Example 1: Simple portfolio update
 */
async function simplePortfolioUpdate() {
  const message = await generateMessage({
    holdings: [
      { symbol: 'AAPL', changePercent: 3.2, currentPrice: 178.50 },
      { symbol: 'NVDA', changePercent: -2.1, currentPrice: 495.30 },
    ],
    shouldGreet: true,
  });

  console.log(message);
  // Output example: "Hey! AAPL up 3.2% while NVDA dipped 2.1%. Looks like tech's having a mixed day 🐇"
}

/**
 * Example 2: Portfolio update with news context
 */
async function portfolioWithNews() {
  const message = await generateMessage({
    holdings: [
      { symbol: 'TSLA', changePercent: 5.7, currentPrice: 242.80 },
    ],
    news: [
      'Tesla announces new Cybertruck production milestone',
      'Analysts raise price targets on delivery numbers',
    ],
    shouldGreet: false,
  });

  console.log(message);
  // Output example: "TSLA popped 5.7% on the Cybertruck production news. Analysts are raising targets, momentum's building 🐇"
}

/**
 * Example 3: Portfolio with sentiment data
 */
async function portfolioWithSentiment() {
  const message = await generateMessage({
    holdings: [
      { symbol: 'GOOGL', changePercent: -3.5, currentPrice: 142.20 },
      { symbol: 'META', changePercent: -2.8, currentPrice: 488.90 },
    ],
    sentiment: {
      positive: 25,
      negative: 60,
      neutral: 15,
    },
    news: [
      'Tech selloff continues amid regulatory concerns',
    ],
  });

  console.log(message);
  // Output example: "GOOGL and META both down on regulatory worries. Sentiment's pretty negative right now, 60% bearish 🐇"
}

/**
 * Example 4: Handling 200 holdings naturally
 */
async function largePortfolio() {
  // Even with 200 holdings, generateMessage intelligently summarizes
  const holdings = [];
  for (let i = 0; i < 200; i++) {
    holdings.push({
      symbol: `STOCK${i}`,
      changePercent: Math.random() * 10 - 5, // -5% to +5%
      currentPrice: Math.random() * 100,
    });
  }

  const message = await generateMessage({
    holdings,
    shouldGreet: true,
  });

  console.log(message);
  // Output example: "Hey! A few movers today. STOCK42 up 4.8%, STOCK17 and STOCK93 also climbing while STOCK156 cooling off 🐇"
}

/**
 * Example 5: Quiet market day
 */
async function quietMarket() {
  const message = await generateMessage({
    holdings: [
      { symbol: 'SPY', changePercent: 0.3, currentPrice: 450.20 },
      { symbol: 'QQQ', changePercent: -0.1, currentPrice: 380.50 },
    ],
    shouldGreet: false,
  });

  console.log(message);
  // Output example: "Just checked your holdings, everything's cruising along normally. Markets are pretty calm today 🐇"
}

// Key Features:
// ✓ Natural, friendly tone like texting a friend
// ✓ No "—" dashes, uses commas and natural breaks
// ✓ Dynamic message generation, no templates
// ✓ Handles 1-200 holdings intelligently
// ✓ Under 1000 characters for Telegram/WhatsApp
// ✓ Includes warm closing: "Check the app for a deeper look 🐇, or tell me what you'd like to explore next."
// ✓ Manual trigger only (no auto-scheduling in examples)
