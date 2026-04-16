import { computeMetrics } from "./metrics.js";
import { OrderbookStore } from "../orderbook/book.js";
import { SnapshotRepository } from "../storage/sqlite.js";

const DEPTH_BANDS = [0.5, 1, 1.5, 2, 3, 4, 5];

interface SchedulerOptions {
  markets: string[];
  intervalMs: number;
  depth: number;
  store: OrderbookStore;
  repo: SnapshotRepository;
  logger: {
    info: (msg: object, text?: string) => void;
  };
}

export class SnapshotScheduler {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly options: SchedulerOptions) { }

  start() {
    this.timer = setInterval(() => this.tick(), this.options.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick() {
    const tsMs = Date.now();
    for (const market of this.options.markets) {
      const top = this.options.store.getTopLevels(market, this.options.depth);
      const metrics = computeMetrics(top.bids, top.asks);
      const depthBands =
        metrics.bestBid === null || metrics.bestAsk === null
          ? []
          : this.options.store.getDepthBands(market, metrics.bestBid, metrics.bestAsk, DEPTH_BANDS);
      this.options.repo.insertSnapshot({
        tsMs,
        market,
        metrics,
        depthBands
      });
      this.options.logger.info(
        {
          market,
          tsMs,
          depth: this.options.depth,
          metrics,
          depthBands
        },
        "Snapshot depth"
      );
    }
  }
}
