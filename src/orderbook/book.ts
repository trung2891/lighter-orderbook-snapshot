import type { BookLevel, DepthBandSummary } from "../types.js";

interface BookSides {
  bids: Map<number, number>;
  asks: Map<number, number>;
}

export class OrderbookStore {
  private books = new Map<string, BookSides>();

  applyLevels(market: string, bids: [number, number][], asks: [number, number][], isSnapshot: boolean) {
    const book = this.ensureBook(market);
    if (isSnapshot) {
      book.bids.clear();
      book.asks.clear();
    }
    this.upsertLevels(book.bids, bids);
    this.upsertLevels(book.asks, asks);
  }

  getTopLevels(market: string, depth: number): { bids: BookLevel[]; asks: BookLevel[] } {
    const book = this.ensureBook(market);
    const bids = this.sortedLevels(book.bids, "desc").slice(0, depth);
    const asks = this.sortedLevels(book.asks, "asc").slice(0, depth);
    return { bids, asks };
  }

  getDepthBands(market: string, bestBid: number, bestAsk: number, bands: number[]): DepthBandSummary[] {
    const book = this.ensureBook(market);
    return bands.map((band) => {
      const minBidPrice = bestBid - band;
      const maxAskPrice = bestAsk + band;

      let bidDepth = 0;
      for (const [price, size] of book.bids.entries()) {
        if (price >= minBidPrice) {
          bidDepth += size;
        }
      }

      let askDepth = 0;
      for (const [price, size] of book.asks.entries()) {
        if (price <= maxAskPrice) {
          askDepth += size;
        }
      }

      return {
        band,
        bidDepth,
        askDepth,
        totalDepth: bidDepth + askDepth
      };
    });
  }

  private ensureBook(market: string): BookSides {
    if (!this.books.has(market)) {
      this.books.set(market, { bids: new Map(), asks: new Map() });
    }
    return this.books.get(market)!;
  }

  private upsertLevels(target: Map<number, number>, levels: [number, number][]) {
    for (const [price, size] of levels) {
      if (size <= 0) {
        target.delete(price);
      } else {
        target.set(price, size);
      }
    }
  }

  private sortedLevels(side: Map<number, number>, direction: "asc" | "desc"): BookLevel[] {
    return [...side.entries()]
      .sort((a, b) => (direction === "asc" ? a[0] - b[0] : b[0] - a[0]))
      .map(([price, size]) => ({ price, size }));
  }
}
