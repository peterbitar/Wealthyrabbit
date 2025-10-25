-- CreateTable
CREATE TABLE "trending_stocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "vibe" TEXT NOT NULL,
    "redditMentions" INTEGER NOT NULL,
    "redditBenchmark" INTEGER NOT NULL,
    "momentum" TEXT NOT NULL,
    "friendsWatching" INTEGER NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "trending_stocks_symbol_key" ON "trending_stocks"("symbol");
