import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@wealthyrabbit.com' },
    update: {},
    create: {
      email: 'test@wealthyrabbit.com',
      name: 'Test User',
    },
  });

  console.log('✅ Created user:', user.email);

  // Create holdings (stocks the user owns)
  const holdings = [
    {
      userId: user.id,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      shares: 25,
      avgPrice: 150.50,
      purchaseDate: new Date('2024-01-15'),
    },
    {
      userId: user.id,
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      shares: 15,
      avgPrice: 245.00,
      purchaseDate: new Date('2024-02-20'),
    },
    {
      userId: user.id,
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      shares: 10,
      avgPrice: 420.00,
      purchaseDate: new Date('2024-03-10'),
    },
  ];

  for (const holding of holdings) {
    await prisma.holding.upsert({
      where: {
        userId_symbol: {
          userId: holding.userId,
          symbol: holding.symbol,
        },
      },
      update: {},
      create: holding,
    });
  }

  console.log('✅ Created holdings');

  // Create watchlist
  const watchlist = [
    { userId: user.id, symbol: 'AMZN', name: 'Amazon' },
    { userId: user.id, symbol: 'GOOGL', name: 'Alphabet' },
    { userId: user.id, symbol: 'MSFT', name: 'Microsoft' },
  ];

  for (const item of watchlist) {
    await prisma.watchlist.upsert({
      where: {
        userId_symbol: {
          userId: item.userId,
          symbol: item.symbol,
        },
      },
      update: {},
      create: item,
    });
  }

  console.log('✅ Created watchlist');

  // Create stock price cache
  const stockPrices = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      currentPrice: 175.25,
      previousClose: 171.00,
      dayChange: 4.25,
      dayChangePercent: 2.48,
      volume: '45.2M',
      marketCap: '2.7T',
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      currentPrice: 238.50,
      previousClose: 242.80,
      dayChange: -4.30,
      dayChangePercent: -1.77,
      volume: '89.1M',
      marketCap: '757B',
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      currentPrice: 485.75,
      previousClose: 470.20,
      dayChange: 15.55,
      dayChangePercent: 3.31,
      volume: '52.3M',
      marketCap: '1.2T',
    },
    {
      symbol: 'AMZN',
      name: 'Amazon',
      currentPrice: 142.50,
      previousClose: 140.80,
      dayChange: 1.70,
      dayChangePercent: 1.21,
      volume: '38.4M',
      marketCap: '1.5T',
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet',
      currentPrice: 138.25,
      previousClose: 138.90,
      dayChange: -0.65,
      dayChangePercent: -0.47,
      volume: '21.7M',
      marketCap: '1.7T',
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft',
      currentPrice: 378.85,
      previousClose: 370.90,
      dayChange: 7.95,
      dayChangePercent: 2.14,
      volume: '28.6M',
      marketCap: '2.8T',
    },
  ];

  for (const price of stockPrices) {
    await prisma.stockPrice.upsert({
      where: { symbol: price.symbol },
      update: price,
      create: price,
    });
  }

  console.log('✅ Created stock price cache');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
