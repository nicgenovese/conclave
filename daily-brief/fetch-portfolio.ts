import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_PATH = resolve(__dirname, "../portal/data/portfolio.json");

// CoinGecko IDs mapped to portfolio tickers
const TICKER_TO_COINGECKO: Record<string, string> = {
  ETH: "ethereum",
  UNI: "uniswap",
  AAVE: "aave",
  HYPE: "hyperliquid",
  PENDLE: "pendle",
  COW: "cow-protocol",
  wstETH: "lido-dao",
  MORPHO: "morpho",
};

// DeFi Llama slugs for TVL
const TVL_PROTOCOLS = ["aave", "pendle", "morpho"];

interface Position {
  name: string;
  ticker: string;
  allocation_usd: number;
  allocation_pct: number;
  bucket: string;
  notes: string;
  coingecko_price?: number;
  market_cap?: number;
  change_24h?: number;
  tvl?: number;
}

interface Portfolio {
  nav: number;
  updated_at: string;
  wallet: string;
  positions: Position[];
  perps: any[];
  total_perp_exposure: number;
  avg_leverage: number;
  max_perp_loss: number;
  allocation_buckets: { name: string; total_usd: number; pct: number; color: string }[];
}

async function fetchCoinGeckoPrices(): Promise<
  Record<string, { usd: number; usd_market_cap?: number; usd_24h_change?: number }>
> {
  const ids = Object.values(TICKER_TO_COINGECKO).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error("[fetch-portfolio] CoinGecko error:", (err as Error).message);
    return {};
  }
}

async function fetchTVL(protocol: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.llama.fi/tvl/${protocol}`);
    if (!res.ok) throw new Error(`DeFi Llama ${res.status}`);
    const tvl = await res.json();
    return typeof tvl === "number" ? tvl : null;
  } catch (err) {
    console.error(`[fetch-portfolio] DeFi Llama TVL error for ${protocol}:`, (err as Error).message);
    return null;
  }
}

export async function fetchPortfolio(): Promise<{ nav: number; positionCount: number }> {
  // Read current portfolio
  let portfolio: Portfolio;
  try {
    portfolio = JSON.parse(readFileSync(PORTFOLIO_PATH, "utf-8"));
  } catch {
    throw new Error(`Cannot read portfolio at ${PORTFOLIO_PATH}`);
  }

  // Fetch prices
  const prices = await fetchCoinGeckoPrices();

  // Fetch TVL in parallel
  const tvlResults = await Promise.all(TVL_PROTOCOLS.map((p) => fetchTVL(p)));
  const tvlMap: Record<string, number> = {};
  TVL_PROTOCOLS.forEach((p, i) => {
    if (tvlResults[i] !== null) tvlMap[p] = tvlResults[i]!;
  });

  // Update positions with new prices
  for (const pos of portfolio.positions) {
    const geckoId = TICKER_TO_COINGECKO[pos.ticker];
    if (!geckoId || !prices[geckoId]) continue;

    const priceData = prices[geckoId];
    const oldPrice = pos.coingecko_price;
    const newPrice = priceData.usd;

    // Estimate new allocation: keep same token quantity, apply new price
    if (oldPrice && oldPrice > 0) {
      const tokenQty = pos.allocation_usd / oldPrice;
      pos.allocation_usd = Math.round(tokenQty * newPrice);
    }

    pos.coingecko_price = newPrice;
    pos.market_cap = priceData.usd_market_cap ?? pos.market_cap;
    pos.change_24h = priceData.usd_24h_change ?? pos.change_24h;
  }

  // Add TVL data to relevant positions
  const tvlTickerMap: Record<string, string> = { aave: "AAVE", pendle: "PENDLE", morpho: "MORPHO" };
  for (const [protocol, tvl] of Object.entries(tvlMap)) {
    const ticker = tvlTickerMap[protocol];
    const pos = portfolio.positions.find((p) => p.ticker === ticker);
    if (pos) pos.tvl = Math.round(tvl);
  }

  // Recalculate NAV from spot positions + perp capital
  const spotTotal = portfolio.positions.reduce((sum, p) => sum + p.allocation_usd, 0);
  const perpCapital = portfolio.perps.reduce((sum, p: any) => sum + p.capital_usd, 0);
  portfolio.nav = spotTotal + perpCapital;

  // Recalculate allocation percentages
  for (const pos of portfolio.positions) {
    pos.allocation_pct = Math.round((pos.allocation_usd / portfolio.nav) * 1000) / 10;
  }

  // Recalculate bucket totals
  const bucketTotals: Record<string, number> = {};
  for (const pos of portfolio.positions) {
    bucketTotals[pos.bucket] = (bucketTotals[pos.bucket] || 0) + pos.allocation_usd;
  }
  // Add perps bucket
  bucketTotals["Perps"] = perpCapital;

  const bucketColors: Record<string, string> = {
    Core: "#3b82f6",
    "DeFi Value": "#8b5cf6",
    Yield: "#10b981",
    Emerging: "#f59e0b",
    Perps: "#ef4444",
    Gas: "#6b7280",
  };

  portfolio.allocation_buckets = Object.entries(bucketTotals).map(([name, total]) => ({
    name,
    total_usd: Math.round(total),
    pct: Math.round((total / portfolio.nav) * 1000) / 10,
    color: bucketColors[name] || "#9ca3af",
  }));

  // Update timestamp
  portfolio.updated_at = new Date().toISOString().split("T")[0];

  // Write back
  writeFileSync(PORTFOLIO_PATH, JSON.stringify(portfolio, null, 2) + "\n", "utf-8");
  console.log(`[fetch-portfolio] Updated ${portfolio.positions.length} positions. NAV: $${portfolio.nav}`);

  return { nav: portfolio.nav, positionCount: portfolio.positions.length };
}

// Allow direct execution
if (process.argv[1]?.endsWith("fetch-portfolio.ts")) {
  fetchPortfolio().catch(console.error);
}
