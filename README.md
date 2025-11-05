# 🐇 WealthyRabbit

**Your calm market companion** - Get intelligent, grouped stock notifications when things actually move.

---

## 🎯 What WealthyRabbit Does

Instead of spamming you with 5 separate notifications, WealthyRabbit:
- ✅ **Groups related stocks by theme** ("AI sector rally", "tech volatility")
- ✅ **Combines multiple sources** (Bloomberg + Reddit + CNBC)
- ✅ **One conversational message** - reads like a friend texting
- ✅ **Smart format selection** - text-only, text+voice, or summary to app
- ✅ **24-hour deduplication** - never repeats the same stock twice

---

## 🚀 Quick Start (Local Development)

```bash
# Clone the repo
git clone <your-repo-url>
cd WealthyRabbit0

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
npx prisma db push

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📦 Tech Stack

- **Framework**: Next.js 15 + React 19
- **Database**: PostgreSQL (Prisma ORM)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **APIs**: 
  - Finnhub (stock data + news)
  - OpenAI (GPT-4o-mini for message generation + TTS for voice)
  - Telegram Bot API

---

## 🎨 Features

### Smart Messaging Hierarchy
1. **TEXT_ONLY** - Simple moves with 1-2 clear points
2. **TEXT_TEASER_AND_VOICE** - Nuanced moves with multiple sources
3. **SUMMARY_TO_APP** - Complex/overwhelming situations

### Multi-Source Intelligence
- **News**: Bloomberg, Reuters, CNBC (via Finnhub)
- **Social**: Reddit sentiment and mentions
- **Cross-referenced**: "After checking Bloomberg and Reddit..."

### Grouped Notifications
```
OLD: 5 stocks moving = 5 separate messages
NEW: 5 stocks moving = 1 cohesive themed message
```

---

## 📁 Project Structure

```
app/
├── api/           # API routes
│   ├── chat/      # AI chatbot
│   ├── stocks/    # Stock data endpoints
│   └── notifications/  # Notification system
├── portfolio/     # Portfolio management
├── discover/      # Trending stocks feed
├── ask/           # AI chat interface
└── manage/        # User settings

lib/
├── basic-notifications.ts   # Core notification logic
├── telegram.ts              # Telegram integration
└── prisma.ts               # Database client

components/
└── [UI components]
```

---

## 🔧 Configuration

See `.env.example` for required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `FINNHUB_API_KEY` - Stock data API key
- `OPENAI_API_KEY` - AI message generation
- `TELEGRAM_BOT_TOKEN` - Bot integration

---

## 🚀 Deployment

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide**

Quick deploy to Vercel:
```bash
./deploy.sh
```

Or manually:
1. Push to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy!

---

## 📊 Cost Estimate (100 users)

- Vercel: **Free** (hobby tier)
- Supabase Postgres: **Free** (500MB limit)
- OpenAI API: **~$10-20/month**
- Finnhub: **Free** (60 calls/min)
- Telegram: **Free**

**Total: $10-20/month for first 100 users**

---

## 🎯 Roadmap

- [x] Grouped notifications by theme
- [x] Multi-source intelligence (news + social)
- [x] Smart messaging hierarchy
- [x] 24-hour deduplication
- [x] Voice notes for complex stories
- [ ] Real Reddit API integration (currently simulated)
- [ ] Twitter/X sentiment
- [ ] Expert analyst opinions
- [ ] Friend activity feed

---

## 📝 License

MIT

---

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

