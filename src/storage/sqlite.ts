import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";
import type { SnapshotMetrics, DepthBandSummary } from "../types.js";

interface InsertPayload {
  tsMs: number;
  market: string;
  metrics: SnapshotMetrics;
  depthBands: DepthBandSummary[];
}

export class SnapshotRepository {
  private readonly db: sqlite3.Database;
  private readonly insertSql = `
    INSERT INTO snapshots (
      ts_ms, market, bids_json, asks_json,
      best_bid, best_ask, spread, mid_price, depth_bands_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  constructor(private readonly dbPath: string) {
    const resolvedPath = path.resolve(dbPath);
    const parentDir = path.dirname(resolvedPath);
    fs.mkdirSync(parentDir, { recursive: true });
    this.db = new sqlite3.Database(resolvedPath);
    this.db.exec("PRAGMA journal_mode=WAL;");
    this.migrate();
  }

  close() {
    this.db.close();
  }

  insertSnapshot(payload: InsertPayload) {
    this.db.run(
      this.insertSql,
      payload.tsMs,
      payload.market,
      "[]",
      "[]",
      payload.metrics.bestBid,
      payload.metrics.bestAsk,
      payload.metrics.spread,
      payload.metrics.midPrice,
      JSON.stringify(payload.depthBands)
    );
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts_ms INTEGER NOT NULL,
        market TEXT NOT NULL,
        bids_json TEXT NOT NULL,
        asks_json TEXT NOT NULL,
        best_bid REAL,
        best_ask REAL,
        spread REAL,
        mid_price REAL,
        depth_bands_json TEXT NOT NULL DEFAULT '[]'
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_market_ts
      ON snapshots(market, ts_ms);
    `);

    this.db.run(
      "ALTER TABLE snapshots ADD COLUMN depth_bands_json TEXT NOT NULL DEFAULT '[]'",
      (error) => {
        if (error && !String(error.message).includes("duplicate column name")) {
          throw error;
        }
      }
    );
  }
}
