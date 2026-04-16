import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  LIGHTER_WS_URL: z.url(),
  LIGHTER_SUBSCRIBE_CHANNEL: z.string().default("order_book"),
  LIGHTER_MARKETS: z.string().default("XAU"),
  SNAPSHOT_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  SNAPSHOT_DEPTH: z.coerce.number().int().positive().default(10),
  SQLITE_PATH: z.string().default("./data/snapshots.db"),
  LOG_LEVEL: z.string().default("info")
});

export interface AppConfig {
  wsUrl: string;
  subscribeChannel: string;
  markets: string[];
  snapshotIntervalMs: number;
  snapshotDepth: number;
  sqlitePath: string;
  logLevel: string;
}

export function loadConfig(): AppConfig {
  const parsed = envSchema.parse(process.env);
  const markets = parsed.LIGHTER_MARKETS.split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  if (markets.length === 0) {
    throw new Error("LIGHTER_MARKETS must contain at least one market");
  }

  return {
    wsUrl: parsed.LIGHTER_WS_URL,
    subscribeChannel: parsed.LIGHTER_SUBSCRIBE_CHANNEL,
    markets,
    snapshotIntervalMs: parsed.SNAPSHOT_INTERVAL_MS,
    snapshotDepth: parsed.SNAPSHOT_DEPTH,
    sqlitePath: parsed.SQLITE_PATH,
    logLevel: parsed.LOG_LEVEL
  };
}
