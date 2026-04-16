import { loadConfig } from "./config.js";
import { LighterClient } from "./lighter/client.js";
import { OrderbookStore } from "./orderbook/book.js";
import { SnapshotScheduler } from "./snapshot/scheduler.js";
import { SnapshotRepository } from "./storage/sqlite.js";
import { createLogger } from "./utils/logger.js";

export function bootstrapApp() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  const store = new OrderbookStore();
  const repo = new SnapshotRepository(config.sqlitePath);
  const client = new LighterClient({
    wsUrl: config.wsUrl,
    channel: config.subscribeChannel,
    markets: config.markets,
    logger
  });

  const scheduler = new SnapshotScheduler({
    markets: config.markets,
    intervalMs: config.snapshotIntervalMs,
    depth: config.snapshotDepth,
    store,
    repo,
    logger
  });

  client.on("book", (frame: { market: string; bids: [number, number][]; asks: [number, number][]; isSnapshot: boolean }) => {
    store.applyLevels(frame.market, frame.bids, frame.asks, frame.isSnapshot);
  });

  const stop = () => {
    scheduler.stop();
    client.stop();
    repo.close();
    logger.info({}, "Application stopped");
  };

  return {
    start: () => {
      client.start();
      scheduler.start();
      logger.info(
        {
          markets: config.markets,
          snapshotIntervalMs: config.snapshotIntervalMs,
          snapshotDepth: config.snapshotDepth
        },
        "Application started"
      );
    },
    stop
  };
}
