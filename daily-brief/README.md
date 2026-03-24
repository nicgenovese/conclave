# Daily Brief — Cheap Data Refresh

Updates portal data files using free APIs. No AI agents, no expensive calls.

## Usage
```bash
npm run brief          # Run full daily brief
npm run fetch:portfolio  # Just update prices
npm run fetch:macro      # Just update Polymarket
```

## Data Sources (all free)
- CoinGecko (free tier, no key) — token prices, market caps
- DeFi Llama (free, no key) — protocol TVL
- Polymarket Gamma API (free, no key) — prediction markets

## Cost
$0 per run (free APIs only)

## Output
Writes updated JSON to `../portal/data/`:
- `portfolio.json` — updated prices, NAV, allocations
- `macro.json` — latest Polymarket events
