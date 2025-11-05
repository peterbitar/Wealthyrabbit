#!/bin/bash

echo "🐇 WealthyRabbit Deployment Script"
echo "=================================="
echo ""

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo "📝 Uncommitted changes detected. Committing..."
    git add .
    git commit -m "Deploy: Grouped notifications with multi-source intelligence"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "🚀 Next steps:"
echo ""
echo "1. Go to https://vercel.com"
echo "2. Click 'New Project'"
echo "3. Import your GitHub repo"
echo "4. Set environment variables:"
echo "   - DATABASE_URL"
echo "   - FINNHUB_API_KEY"
echo "   - OPENAI_API_KEY"
echo "   - TELEGRAM_BOT_TOKEN"
echo "5. Deploy!"
echo ""
echo "📖 Full guide: See DEPLOYMENT.md"
