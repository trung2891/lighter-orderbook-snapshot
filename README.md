# Lighter Orderbook Snapshot (TypeScript)

TypeScript service to monitor orderbook depth for Lighter markets (default `XAU`) and write 1-second snapshots to SQLite.

## Features

- Official websocket client flow with reconnect + exponential backoff.
- Multi-market by config (`LIGHTER_MARKETS=XAU,BTC,...`).
- Top-N levels are used in-memory for metric calculation (default top 10 each side).
- Basic metrics per snapshot: `bestBid`, `bestAsk`, `spread`, `midPrice`.
- Depth bands per snapshot: total depth inside `+-1`, `+-2`, `+-3`, `+-4`, `+-5` around best prices.
- Snapshot rows are lightweight: no raw bids/asks persisted.
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

- `LIGHTER_WS_URL`: websocket URL, default `wss://mainnet.zklighter.elliot.ai/stream`.
- `LIGHTER_SUBSCRIBE_CHANNEL`: base channel, default `order_book` (client subscribes as `order_book/{marketId}`).
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
- `bids_json` (TEXT) - kept as `[]` for backward compatibility.
- `asks_json` (TEXT) - kept as `[]` for backward compatibility.
- `best_bid`, `best_ask`, `spread`, `mid_price` (REAL)
- `depth_bands_json` (TEXT JSON array)

`depth_bands_json` format:

```json
[
  { "band": 1, "bidDepth": 12.34, "askDepth": 10.12, "totalDepth": 22.46 },
  { "band": 2, "bidDepth": 40.11, "askDepth": 35.88, "totalDepth": 75.99 }
]
```

Band math:
- Bid band `N`: sum bid sizes with `price >= bestBid - N`
- Ask band `N`: sum ask sizes with `price <= bestAsk + N`
- `totalDepth = bidDepth + askDepth`

Index: `idx_snapshots_market_ts (market, ts_ms)`.

## Verify Data Is Writing

```bash
sqlite3 ./data/snapshots.db "SELECT market, ts_ms, best_bid, best_ask, spread FROM snapshots ORDER BY id DESC LIMIT 5;"
```

Inspect depth bands:

```bash
sqlite3 ./data/snapshots.db "SELECT market, ts_ms, depth_bands_json FROM snapshots ORDER BY id DESC LIMIT 5;"
```

## Jupyter Analysis

Analyze XAU depth volatility from the stored snapshots:

```bash
python3 -m pip install -r requirements-notebook.txt
python3 -m jupyter notebook notebooks/xau_depth_volatility.ipynb
```

The notebook:
- loads `XAU` rows from `data/snapshots.db`
- flattens `depth_bands_json` for bands `0.5, 1, 1.5, 2, 3, 4, 5`
- computes 1-second depth changes, returns, rolling volatility, z-scores, and imbalance
- plots total depth, rolling depth volatility, heatmaps, spread context, and spike tables

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

- The client resolves `marketId` from `GET /api/v1/orderBooks` and subscribes with `type=subscribe`, `channel=order_book/{marketId}`.
- If Lighter changes feed schema, update parser logic in `src/lighter/client.ts`.
