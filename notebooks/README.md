# Notebooks Guide

This folder currently contains:

- `xau_depth_volatility.ipynb`: analysis notebook for XAU orderbook depth snapshots from SQLite.

## Data Context

The notebook uses per-second snapshots with:

- `best_bid`, `best_ask`, `spread`, `mid_price`
- `depth_bands_json` expanded into:
  - `bid_depth_<band>`
  - `ask_depth_<band>`
  - `total_depth_<band>`

Where each `band` is a price distance from top-of-book (for example `0.5`, `1`, `1.5`, `2`, `3`, `4`, `5`).

## Chart Explanations

### Chart 1: Bid Depth vs Ask Depth Over Time

- **What it shows**
  - One chart for bid depth across bands.
  - One chart for ask depth across bands.
- **Why it matters**
  - Helps identify which side (buy/sell liquidity) is stronger.
  - Reveals whether depth concentrates near top-of-book or further away.
- **How to read**
  - Rising bid depth with flat ask depth often means stronger downside support.
  - Rising ask depth with flat bid depth often means stronger overhead resistance.

### Chart 2: Rolling Volatility of Bid/Ask Depth

- **What it shows**
  - Rolling standard deviation (window = configured in notebook) for bid depth and ask depth by band.
- **Why it matters**
  - Measures instability of liquidity, not just its level.
  - Highlights periods where orderbook changes become noisy/aggressive.
- **How to read**
  - High rolling std = depth is unstable (fast add/cancel/requote behavior).
  - If ask volatility > bid volatility persistently, sell-side liquidity is less stable (and vice versa).

### Chart 3: Heatmap of Absolute 1-Second Depth Change

- **What it shows**
  - Heatmap for `|1-second bid depth change|` by band.
  - Heatmap for `|1-second ask depth change|` by band.
- **Why it matters**
  - Quickly locates time intervals and bands with sudden liquidity shocks.
  - Easier to spot clusters of microstructure events than line charts.
- **How to read**
  - Brighter areas = stronger local depth reconfiguration.
  - Vertical bright stripes = broad market-wide re-pricing moments.
  - Bright only at small bands = activity concentrated near top-of-book.

### Chart 4: Price/Spread with Bid-Ask Volatility Context

- **What it shows**
  - `mid_price` time series.
  - `spread` time series.
  - Rolling mean of absolute bid depth change and ask depth change (selected context band).
  - `imbalance` series.
- **Why it matters**
  - Connects liquidity behavior to price and spread conditions.
  - Useful for checking if depth turbulence precedes/aligns with spread widening or price moves.
- **How to read**
  - Depth volatility spikes + spread widening often indicate stressed liquidity.
  - Strong positive imbalance indicates bid side dominance; negative indicates ask side dominance.

### Chart 5: Separate Key-Band Bid and Ask Charts

- **What it shows**
  - Dedicated bid-depth panels for selected key bands.
  - Dedicated ask-depth panels for the same key bands.
- **Why it matters**
  - Cleaner visual comparison than overlaying bid/ask in one plot.
  - Helps evaluate side-specific behavior at the most relevant execution bands.
- **How to read**
  - Compare slope, spikes, and persistence across bands and between sides.
  - If one side repeatedly thins at near bands, short-term slippage risk increases on that side.

## Practical Interpretation Tips

- Near bands (small distance) are usually most important for immediate execution quality.
- Far bands help assess reserve liquidity and potential resilience after shocks.
- Use chart combinations:
  - Chart 1 + Chart 2 for level-vs-volatility context.
  - Chart 3 to pinpoint shock timestamps.
  - Chart 4 to relate shocks to spread/price behavior.

## Large Dataset Handling (up to ~1M points)

The notebook now includes built-in plotting safeguards:

- `MAX_PLOT_POINTS` (default `5000`): maximum rows used for line charts.
- `HEATMAP_MAX_COLUMNS` (default `2000`): maximum columns used for heatmaps.

How it works:

- Full analytics and feature engineering are still computed on full `df`.
- A downsampled `plot_df` is created for line-based charts.
- A second downsampled `heatmap_df` is created for heatmaps.

Why this matters:

- Prevents notebook UI freeze and excessive memory pressure.
- Keeps chart rendering interactive while preserving overall shape/trend.

If you want more detail:

- Increase `MAX_PLOT_POINTS` gradually (for example `10000`, `20000`).
- Keep `HEATMAP_MAX_COLUMNS` lower than line-chart points for responsiveness.
