import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('Testing Supabase PostgreSQL connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully!\n');

    // Test 2: Try to query (this will show if tables exist)
    console.log('2. Checking if tables exist...');
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Users table exists (${userCount} users)`);
    } catch (e) {
      console.log('❌ Users table does not exist yet');
    }

    try {
      const listCount = await prisma.list.count();
      console.log(`✅ Lists table exists (${listCount} lists)`);
    } catch (e) {
      console.log('❌ Lists table does not exist yet');
    }

    try {
      const holdingCount = await prisma.holding.count();
      console.log(`✅ Holdings table exists (${holdingCount} holdings)`);
    } catch (e) {
      console.log('❌ Holdings table does not exist yet');
    }

    console.log('\n3. Testing raw query...');
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('✅ Raw query successful:');
    console.log(result);

  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('P1001')) {
        console.log('\n💡 This is a connection error. Possible causes:');
        console.log('   - Database server is not reachable (firewall/network issue)');
        console.log('   - Incorrect DATABASE_URL in .env');
        console.log('   - Supabase project is paused');
      } else if (error.message.includes('P1003')) {
        console.log('\n💡 Database does not exist or you don\'t have access');
      }
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n✨ Disconnected from database');
  }
}

testConnection();
