export type Side = "bid" | "ask";

export interface BookLevel {
  price: number;
  size: number;
}

export interface MarketConfig {
  market: string;
}

export interface BookSnapshot {
  market: string;
  tsMs: number;
  bids: BookLevel[];
  asks: BookLevel[];
}

export interface SnapshotMetrics {
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  midPrice: number | null;
}

export interface DepthBandSummary {
  band: number;
  bidDepth: number;
  askDepth: number;
  totalDepth: number;
}
