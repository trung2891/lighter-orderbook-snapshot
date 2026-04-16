# Lighter Orderbook Snapshot (TypeScript)

TypeScript service to monitor orderbook depth for Lighter markets (default `XAU`) and write 1-second snapshots to SQLite.

## Features

- Official websocket client flow with reconnect + exponential backoff.
- Multi-market by config (`LIGHTER_MARKETS=XAU,BTC,...`).
- Top-N levels each side per snapshot (default top 10 bids/asks).
- Basic metrics per snapshot: `bestBid`, `bestAsk`, `spread`, `midPrice`.
- SQLite persistence with WAL mode and `(market, ts_ms)` index.
- Ready-to-run with PM2 and a Systemd unit template.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

## Configuration

Set values in `.env`:

- `LIGHTER_WS_URL`: official Lighter websocket URL.
- `LIGHTER_SUBSCRIBE_CHANNEL`: channel name for orderbook stream.
- `LIGHTER_MARKETS`: comma-separated market list; default `XAU`.
- `SNAPSHOT_INTERVAL_MS`: snapshot period; default `1000`.
- `SNAPSHOT_DEPTH`: top levels per side; default `10`.
- `SQLITE_PATH`: output db path; default `./data/snapshots.db`.
- `LOG_LEVEL`: `trace|debug|info|warn|error`.

## Build And Start

```bash
npm run build
npm run start
```

## SQLite Schema

Table: `snapshots`

- `id` (INTEGER PK)
- `ts_ms` (INTEGER)
- `market` (TEXT)
- `bids_json` (TEXT)
- `asks_json` (TEXT)
- `best_bid`, `best_ask`, `spread`, `mid_price` (REAL)

Index: `idx_snapshots_market_ts (market, ts_ms)`.

## Verify Data Is Writing

```bash
sqlite3 ./data/snapshots.db "SELECT market, ts_ms, best_bid, best_ask, spread FROM snapshots ORDER BY id DESC LIMIT 5;"
```

## PM2 Deployment

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs lighter-orderbook-snapshot
```

## Systemd Deployment

1. Copy project to target host path (example `/opt/lighter-orderbook-snapshot`).
2. Build on host: `npm ci && npm run build`.
3. Copy `lighter-orderbook-snapshot.service` to `/etc/systemd/system/`.
4. Edit service file user/path if needed.
5. Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable lighter-orderbook-snapshot
sudo systemctl start lighter-orderbook-snapshot
sudo systemctl status lighter-orderbook-snapshot
```

## Notes

- The websocket payload parser is intentionally tolerant to common orderbook frame shapes (`market/symbol/pair`, root-level or `data` nested bids/asks).
- If Lighter changes feed schema, update parser logic in `src/lighter/client.ts`.
