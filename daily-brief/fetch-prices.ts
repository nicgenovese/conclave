/**
 * fetch-prices.ts — unified live price fetcher with 24h + 7d change.
 *
 * Pulls from DefiLlama's prices API for every token in the watchlist,
 * plus BTC/ETH/SPX benchmarks. Yahoo Finance for SPX since DefiLlama
 * doesn't cover equities.
 *
 * Writes portal/data/prices.json — one keyed dictionary:
 *   { BTC: { name, price, change_24h_pct, change_7d_pct, ... }, ... }
 *
 * Replaces fetch-benchmarks.ts as the single source of truth for prices.
 * No LLM, deterministic, runs in every 12h cycle.
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { WATCHLIST } from "./lib/watchlist.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../portal/data");
const OUT_PATH = resolve(DATA_DIR, "prices.json");

export interface PriceRow {
  ticker: string;
  name: string;
  price: number | null;
  change_24h_pct: number | null;
  change_7d_pct: number | null;
  price_24h_ago: number | null;
  price_7d_ago: number | null;
  source: string;
  error?: string;
}

export interface PricesData {
  updated_at: string;
  tokens: Record<string, PriceRow>;
}

// ─────────────────────────────────────────────
// DefiLlama batch price fetch
// Endpoint accepts comma-separated list of "coingecko:{id}" keys
// ─────────────────────────────────────────────
async function fetchDefiLlamaBatch(
  coinIds: string[],
  timestamp?: number,
): Promise<Record<string, { price: number; symbol?: string }>> {
  if (coinIds.length === 0) return {};
  const joined = coinIds.join(",");
  const endpoint = timestamp
    ? `https://coins.llama.fi/prices/historical/${timestamp}/${joined}`
    : `https://coins.llama.fi/prices/current/${joined}`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`DefiLlama ${res.status}`);
    const json = (await res.json()) as {
      coins: Record<string, { price: number; symbol?: string }>;
    };
    return json.coins || {};
  } catch (err) {
    console.error(`[prices] DefiLlama batch failed:`, (err as Error).message);
    return {};
  }
}

// ─────────────────────────────────────────────
// Yahoo Finance — for SPX and any other non-crypto benchmark
// ─────────────────────────────────────────────
async function fetchYahoo(symbol: string): Promise<{
  price: number | null;
  change_24h_pct: number | null;
  change_7d_pct: number | null;
  price_24h_ago: number | null;
  price_7d_ago: number | null;
}> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`,
      { headers: { "User-Agent": "Mozilla/5.0 Conclave/1.0" } },
    );
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; previousClose?: number };
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const meta = json?.chart?.result?.[0]?.meta;
    const closes = (json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(
      (c): c is number => typeof c === "number",
    );

    const price = meta?.regularMarketPrice ?? (closes.length > 0 ? closes[closes.length - 1] : null);
    const price_24h_ago = closes.length >= 2 ? closes[closes.length - 2] : null;
    const price_7d_ago = closes.length >= 8 ? closes[closes.length - 8] : null;

    const change_24h_pct =
      price !== null && price_24h_ago !== null && price_24h_ago > 0
        ? ((price - price_24h_ago) / price_24h_ago) * 100
        : null;
    const change_7d_pct =
      price !== null && price_7d_ago !== null && price_7d_ago > 0
        ? ((price - price_7d_ago) / price_7d_ago) * 100
        : null;

    return { price, change_24h_pct, change_7d_pct, price_24h_ago, price_7d_ago };
  } catch {
    return {
      price: null,
      change_24h_pct: null,
      change_7d_pct: null,
      price_24h_ago: null,
      price_7d_ago: null,
    };
  }
}

// ─────────────────────────────────────────────
// Main fetch
// ─────────────────────────────────────────────
export async function fetchPrices(): Promise<PricesData> {
  // Build DefiLlama coin key for every watchlist token that has a coingecko_id
  const watchlistCoins = WATCHLIST.filter((p) => p.coingecko_id)
    .map((p) => ({
      key: `coingecko:${p.coingecko_id}`,
      ticker: p.ticker,
      name: p.name,
    }));

  // Add BTC explicitly (not in watchlist but used as benchmark)
  const btcEntry = { key: "coingecko:bitcoin", ticker: "BTC", name: "Bitcoin" };
  // Dedupe in case BTC is already in watchlist
  const allCoins = watchlistCoins.find((c) => c.ticker === "BTC")
    ? watchlistCoins
    : [btcEntry, ...watchlistCoins];

  const allKeys = allCoins.map((c) => c.key);
  const now = Math.floor(Date.now() / 1000);

  console.log(`[prices] Fetching current/24h/7d for ${allKeys.length} tokens from DefiLlama...`);

  const [current, day, week] = await Promise.all([
    fetchDefiLlamaBatch(allKeys),
    fetchDefiLlamaBatch(allKeys, now - 24 * 3600),
    fetchDefiLlamaBatch(allKeys, now - 7 * 24 * 3600),
  ]);

  const tokens: Record<string, PriceRow> = {};

  for (const coin of allCoins) {
    const c = current[coin.key]?.price ?? null;
    const d = day[coin.key]?.price ?? null;
    const w = week[coin.key]?.price ?? null;

    const change_24h_pct = c !== null && d !== null && d > 0 ? ((c - d) / d) * 100 : null;
    const change_7d_pct = c !== null && w !== null && w > 0 ? ((c - w) / w) * 100 : null;

    tokens[coin.ticker] = {
      ticker: coin.ticker,
      name: coin.name,
      price: c,
      change_24h_pct,
      change_7d_pct,
      price_24h_ago: d,
      price_7d_ago: w,
      source: "defillama",
    };
  }

  // S&P 500 from Yahoo
  console.log(`[prices] Fetching S&P 500 from Yahoo Finance...`);
  const spx = await fetchYahoo("^GSPC");
  tokens["SPX"] = {
    ticker: "SPX",
    name: "S&P 500",
    price: spx.price,
    change_24h_pct: spx.change_24h_pct,
    change_7d_pct: spx.change_7d_pct,
    price_24h_ago: spx.price_24h_ago,
    price_7d_ago: spx.price_7d_ago,
    source: "yahoo",
  };

  return {
    updated_at: new Date().toISOString(),
    tokens,
  };
}

// ─────────────────────────────────────────────
// Standalone runner
// ─────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchPrices()
    .then((data) => {
      writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
      const entries = Object.values(data.tokens);
      const live = entries.filter((t) => t.price !== null);
      console.log(`[prices] Wrote ${OUT_PATH}`);
      console.log(`[prices] ${live.length}/${entries.length} tokens with live prices`);
      console.log();
      console.log("Sample:");
      for (const t of live.slice(0, 10)) {
        const d24 =
          t.change_24h_pct !== null
            ? `${t.change_24h_pct > 0 ? "+" : ""}${t.change_24h_pct.toFixed(1)}%`
            : "—";
        const d7d =
          t.change_7d_pct !== null
            ? `${t.change_7d_pct > 0 ? "+" : ""}${t.change_7d_pct.toFixed(1)}%`
            : "—";
        console.log(
          `  ${t.ticker.padEnd(10)} ${t.name.padEnd(25)} $${(t.price ?? 0).toFixed(2).padStart(10)}  24h ${d24.padStart(8)}  7d ${d7d.padStart(8)}`,
        );
      }
    })
    .catch((err) => {
      console.error("[prices] Failed:", err);
      process.exit(1);
    });
}
