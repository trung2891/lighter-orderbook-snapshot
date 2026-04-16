import type { SnapshotMetrics } from "../types.js";

export function computeMetrics(bids: { price: number }[], asks: { price: number }[]): SnapshotMetrics {
  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;

  if (bestBid === null || bestAsk === null) {
    return {
      bestBid,
      bestAsk,
      spread: null,
      midPrice: null
    };
  }

  return {
    bestBid,
    bestAsk,
    spread: bestAsk - bestBid,
    midPrice: (bestAsk + bestBid) / 2
  };
}
