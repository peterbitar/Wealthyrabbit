import { prisma } from "./prisma";

export type ListType = "Invested" | "Watchlist";

// For backwards compatibility with frontend
export interface Ticker {
  id: string;
  symbol: string;
  addedAt: Date;
}

export interface List {
  id: string;
  name: string;
  type: ListType;
  tickers: Ticker[];
  createdAt: Date;
}

// Temporary hardcoded user ID (replace with auth later)
const DEFAULT_USER_ID = "default-user";

export const listService = {
  async ensureDefaultUser() {
    const user = await prisma.user.findUnique({
      where: { id: DEFAULT_USER_ID },
    });

    if (!user) {
      await prisma.user.create({
        data: {
          id: DEFAULT_USER_ID,
          email: "user@wealthyrabbit.com",
          name: "Default User",
        },
      });
    }
  },

  async getLists(): Promise<List[]> {
    await this.ensureDefaultUser();

    const lists = await prisma.list.findMany({
      where: { userId: DEFAULT_USER_ID },
      include: {
        holdings: {
          orderBy: { addedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return lists.map((list) => ({
      id: list.id,
      name: list.name,
      type: list.type as ListType,
      tickers: list.holdings.map((h) => ({
        id: h.id,
        symbol: h.symbol,
        addedAt: h.addedAt,
      })),
      createdAt: list.createdAt,
    }));
  },

  async createList(name: string, type: ListType): Promise<List> {
    await this.ensureDefaultUser();

    const list = await prisma.list.create({
      data: {
        name,
        type,
        userId: DEFAULT_USER_ID,
      },
      include: {
        holdings: true,
      },
    });

    return {
      id: list.id,
      name: list.name,
      type: list.type as ListType,
      tickers: [],
      createdAt: list.createdAt,
    };
  },

  async getList(id: string): Promise<List | null> {
    const list = await prisma.list.findUnique({
      where: { id },
      include: {
        holdings: {
          orderBy: { addedAt: "desc" },
        },
      },
    });

    if (!list) return null;

    return {
      id: list.id,
      name: list.name,
      type: list.type as ListType,
      tickers: list.holdings.map((h) => ({
        id: h.id,
        symbol: h.symbol,
        addedAt: h.addedAt,
      })),
      createdAt: list.createdAt,
    };
  },

  async addTicker(listId: string, symbol: string): Promise<Ticker | null> {
    const list = await prisma.list.findUnique({ where: { id: listId } });
    if (!list) return null;

    const holding = await prisma.holding.create({
      data: {
        symbol: symbol.toUpperCase(),
        listId,
      },
    });

    return {
      id: holding.id,
      symbol: holding.symbol,
      addedAt: holding.addedAt,
    };
  },

  async removeTicker(listId: string, tickerId: string): Promise<boolean> {
    try {
      await prisma.holding.delete({
        where: {
          id: tickerId,
          listId,
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  async deleteList(listId: string): Promise<boolean> {
    try {
      await prisma.list.delete({
        where: { id: listId },
      });
      return true;
    } catch {
      return false;
    }
  },
};
