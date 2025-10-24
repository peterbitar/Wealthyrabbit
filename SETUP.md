# WealthyRabbit v2 Setup Guide

This version integrates **Prisma** with **Supabase PostgreSQL** for persistent data storage.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)

## Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose an organization and fill in project details:
   - **Name**: WealthyRabbit (or any name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to you
4. Wait for the project to be created (~2 minutes)

### 2. Get Your Database URL

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection String** → **URI**
3. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with the database password you set earlier

### 3. Configure Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and paste your Supabase DATABASE_URL:
   ```env
   DATABASE_URL="postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres"
   ```

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Run Database Migration

This creates the tables (users, lists, holdings) in your Supabase database:

```bash
pnpm prisma:mig
```

When prompted for a migration name, you can use something like `init` or just press Enter.

### 6. Generate Prisma Client

```bash
pnpm prisma:gen
```

### 7. Start the Development Server

```bash
pnpm dev
```

Your app should now be running at `http://localhost:3000`

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm prisma:mig` - Run database migrations
- `pnpm prisma:gen` - Generate Prisma Client

## Database Schema

### User
- id (String, Primary Key)
- email (String, Unique)
- name (String, Optional)
- createdAt (DateTime)
- updatedAt (DateTime)

### List
- id (String, Primary Key)
- name (String)
- type (String) - "Invested" or "Watchlist"
- userId (String, Foreign Key → User)
- createdAt (DateTime)
- updatedAt (DateTime)

### Holding
- id (String, Primary Key)
- symbol (String) - Stock ticker symbol
- listId (String, Foreign Key → List)
- addedAt (DateTime)

## Viewing Your Database

You can view and manage your data in the Supabase dashboard:

1. Go to your Supabase project
2. Click **Table Editor** in the left sidebar
3. You'll see your `users`, `lists`, and `holdings` tables

## Troubleshooting

**Migration fails?**
- Verify your DATABASE_URL is correct in `.env`
- Make sure your Supabase project is active
- Check that your database password doesn't contain special characters that need URL encoding

**Prisma Client errors?**
- Run `pnpm prisma:gen` to regenerate the client
- Restart your dev server

**Connection issues?**
- Supabase allows connections from anywhere by default
- Check your internet connection
- Verify the project isn't paused (Supabase pauses inactive free tier projects)

## Next Steps

- Add authentication (Supabase Auth, NextAuth, etc.)
- Replace hardcoded `DEFAULT_USER_ID` with actual user sessions
- Add more features (price tracking, portfolio analytics, etc.)
