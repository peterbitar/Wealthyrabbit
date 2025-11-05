import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate mock historical data for demonstration
 * TODO: Replace with real API when upgrading to paid tier
 */
function generateMockHistory(symbol: string, range: string) {
  const now = Date.now();
  let days: number;
  let basePrice = 100; // Default base price

  // Set realistic base prices for common stocks
  const stockPrices: Record<string, number> = {
    'AAPL': 175,
    'GOOGL': 140,
    'META': 310,
    'NVDA': 450,
    'TSLA': 220,
    'AMZN': 145,
    'MSFT': 380,
    'PLTR': 25,
  };

  basePrice = stockPrices[symbol] || 100;

  switch (range) {
    case '1D':
    case '1W':
      days = 7;
      break;
    case '1M':
      days = 30;
      break;
    case '3M':
      days = 90;
      break;
    default:
      days = 7;
  }

  const history = [];
  let currentPrice = basePrice;

  for (let i = days; i >= 0; i--) {
    const timestamp = now - (i * 24 * 3600 * 1000);
    const date = new Date(timestamp);

    // Random walk with slight upward bias
    const changePercent = (Math.random() - 0.48) * 3; // -1.44% to 1.56%
    const openPrice = currentPrice;
    currentPrice = currentPrice * (1 + changePercent / 100);

    history.push({
      timestamp,
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      price: Number(currentPrice.toFixed(2)),
      change: Number(changePercent.toFixed(2)),
    });
  }

  return history;
}

/**
 * GET /api/stocks/history
 * Get historical price data for a stock
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1W';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  // For now, use mock data due to Finnhub free tier limitations
  // TODO: Implement real API calls when upgrading to paid tier
  console.log(`Generating mock historical data for ${symbol}, range: ${range}`);

  const history = generateMockHistory(symbol, range);

  return NextResponse.json({
    history,
    symbol,
    range,
    _note: 'Using mock data - upgrade API plan for real data'
  });
}
