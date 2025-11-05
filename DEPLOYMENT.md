# 🚀 WealthyRabbit Deployment Guide

## Quick Start: Deploy to Vercel (5 minutes)

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)
- API keys ready:
  - Finnhub API key
  - OpenAI API key
  - Telegram Bot Token

---

## Step 1: Push to GitHub

```bash
# Add all changes
git add .

# Commit
git commit -m "Prepare for deployment - grouped notifications with multi-source"

# Push to GitHub
git push origin main
```

---

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js - click "Deploy"
5. Wait 2 minutes for build to complete

### Option B: Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Step 3: Set Up Production Database

### Option A: Vercel Postgres (Recommended)

```bash
# Create database
vercel postgres create

# Link to project
vercel link

# Get connection string (will be auto-added to env vars)
```

### Option B: Supabase (Free tier)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings > Database
4. Copy "Connection string" (Transaction mode)
5. Add to Vercel environment variables

---

## Step 4: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
DATABASE_URL=postgresql://[your-postgres-url]
FINNHUB_API_KEY=your_finnhub_key
OPENAI_API_KEY=your_openai_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

---

## Step 5: Run Database Migration

```bash
# In your Vercel project settings, add build command:
npx prisma generate && npx prisma db push && next build

# Or run manually after deploy:
vercel env pull .env.production
npx prisma db push
```

---

## Step 6: Set Up Telegram Webhook

Your bot needs to receive messages. Update webhook URL:

```bash
# Replace YOUR_BOT_TOKEN and YOUR_VERCEL_URL
curl https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook \
  -d "url=https://YOUR_VERCEL_URL.vercel.app/api/telegram/webhook"
```

---

## Step 7: Start Inviting Users! 🎉

### User Onboarding Flow:

1. **User starts bot on Telegram**
   - Send them: `t.me/your_bot_name`
   - They click "Start"

2. **User connects account**
   - Bot sends them link to app
   - They sign up and link Telegram

3. **User adds holdings**
   - Go to Portfolio page
   - Add stocks they want to track

4. **Done!** They'll now get:
   - Grouped notifications when stocks move >3%
   - Multi-source insights (news + social)
   - One conversational message, not spam

---

## 🔧 Troubleshooting

### Issue: Notifications not sending

Check these in order:

1. **Telegram bot webhook set?**
   ```bash
   curl https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo
   ```

2. **Environment variables set in Vercel?**
   - Go to Vercel → Settings → Environment Variables
   - Verify all keys present

3. **Database connected?**
   - Check Vercel logs for Prisma errors

4. **Cron job running?**
   - Vercel has built-in cron support
   - Add `vercel.json` for scheduled checks

---

## 📅 Set Up Automatic Checks (Cron)

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/briefing/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This runs notification checks every 5 minutes automatically.

---

## 📊 Monitor Your App

**Vercel Dashboard shows:**
- Deployment logs
- Runtime logs
- Error tracking
- Performance metrics

**Check notification delivery:**
- Telegram bot receives messages
- Database logs in Vercel logs
- OpenAI API usage in OpenAI dashboard

---

## 💰 Cost Estimate (for 100 users)

- **Vercel**: Free (up to 100GB bandwidth)
- **Postgres**: $5/month (Supabase free tier: 500MB)
- **OpenAI**: ~$10-20/month (depends on usage)
- **Finnhub**: Free tier (60 calls/min)
- **Telegram**: Free

**Total: ~$15-25/month for 100 users**

---

## 🎯 Post-Deployment Checklist

- [ ] App deployed to Vercel
- [ ] Database connected and migrated
- [ ] Environment variables set
- [ ] Telegram webhook configured
- [ ] Cron job set up
- [ ] Test with your own account
- [ ] Invite 2-3 beta users
- [ ] Monitor for 24 hours
- [ ] Start inviting more users!

---

## 📞 Need Help?

Common issues:
- "Database connection failed" → Check DATABASE_URL in env vars
- "Telegram not responding" → Verify webhook URL is correct
- "No notifications sending" → Check cron job is running

