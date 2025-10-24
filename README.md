# WealthyRabbit

A modern stock portfolio tracking application built with Next.js, TypeScript, Prisma, and Supabase.

## Features

- **List Management**: Create custom watchlists and track your invested stocks
- **Ticker Tracking**: Add and manage stock ticker symbols in your lists
- **Persistent Storage**: Data stored in Supabase PostgreSQL database
- **Modern UI**: Clean interface built with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Package Manager**: pnpm

## Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL

# 3. Run database migration
pnpm prisma:mig

# 4. Generate Prisma Client
pnpm prisma:gen

# 5. Start development server
pnpm dev
```

Visit `http://localhost:3000`

## Project Structure

```
WealthyRabbit0/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── lists/        # List & ticker endpoints
│   ├── lists/            # Lists page
│   ├── settings/         # Settings page
│   └── layout.tsx        # Root layout
├── components/           # React components
│   └── Navbar.tsx       # Navigation bar
├── lib/                 # Business logic
│   ├── lists.ts        # List service (Prisma)
│   └── prisma.ts       # Prisma client
├── prisma/             # Database
│   └── schema.prisma   # Database schema
└── SETUP.md           # Setup instructions
```

## Version History

- **v0**: Initial Next.js setup with placeholder pages
- **v1**: In-memory list management (resets on restart)
- **v2**: Prisma + Supabase integration with persistent storage

## License

MIT
