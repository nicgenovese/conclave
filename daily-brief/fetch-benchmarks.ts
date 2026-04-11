/**
 * fetch-benchmarks.ts — one-shot deterministic fetcher for the three
 * benchmarks the dashboard compares Moria's NAV against:
 *   - BTC (CoinGecko via DefiLlama)
 *   - ETH (DefiLlama prices)
 *   - S&P 500 proxy via Yahoo Finance ^GSPC
 *
 * Output: portal/data/benchmarks.json
 *
 * No LLM, no personality — just raw numbers. Runs inside every 12h cron cycle.
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../portal/data");
const OUT_PATH = resolve(DATA_DIR, "benchmarks.json");

export interface Benchmark {
  symbol: string;
  label: string;
  price: number | null;
  change_pct_24h: number | null;
  source: string;
  error?: string;
}

export interface BenchmarksData {
  updated_at: string;
  btc: Benchmark;
  eth: Benchmark;
  spx: Benchmark;
}

// ─────────────────────────────────────────────
// DefiLlama /prices/current/coins
// Returns price only, no 24h change. We fetch today + yesterday to get change.
// ─────────────────────────────────────────────
async function fetchDefiLlamaPrice(coinId: string): Promise<{ price: number | null; change_pct_24h: number | null }> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 24 * 3600;

    const [currentRes, pastRes] = await Promise.all([
      fetch(`https://coins.llama.fi/prices/current/${coinId}`),
      fetch(`https://coins.llama.fi/prices/historical/${dayAgo}/${coinId}`),
    ]);

    const currentJson = (await currentRes.json()) as { coins: Record<string, { price: number }> };
    const pastJson = (await pastRes.json()) as { coins: Record<string, { price: number }> };

    const current = currentJson.coins[coinId]?.price ?? null;
    const past = pastJson.coins[coinId]?.price ?? null;

    const change_pct_24h =
      current !== null && past !== null && past > 0 ? ((current - past) / past) * 100 : null;

    return { price: current, change_pct_24h };
  } catch {
    return { price: null, change_pct_24h: null };
  }
}

// ─────────────────────────────────────────────
// Yahoo Finance — S&P 500 (^GSPC)
// Chart endpoint returns last 2 closes so we can compute 24h change.
// ─────────────────────────────────────────────
async function fetchYahoo(symbol: string): Promise<{ price: number | null; change_pct_24h: number | null }> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
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
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];

    const price = meta?.regularMarketPrice ?? null;
    const prev = meta?.previousClose ?? closes.filter((c) => c !== null).slice(-2)[0] ?? null;
    const change_pct_24h =
      price !== null && prev !== null && prev > 0 ? ((price - prev) / prev) * 100 : null;

    return { price, change_pct_24h };
  } catch {
    return { price: null, change_pct_24h: null };
  }
}

export async function fetchBenchmarks(): Promise<BenchmarksData> {
  console.log("[benchmarks] Fetching BTC, ETH, S&P 500...");
  const [btc, eth, spx] = await Promise.all([
    fetchDefiLlamaPrice("coingecko:bitcoin"),
    fetchDefiLlamaPrice("coingecko:ethereum"),
    fetchYahoo("^GSPC"),
  ]);

  const now = new Date().toISOString();
  return {
    updated_at: now,
    btc: { symbol: "BTC", label: "Bitcoin", ...btc, source: "defillama" },
    eth: { symbol: "ETH", label: "Ethereum", ...eth, source: "defillama" },
    spx: { symbol: "SPX", label: "S&P 500", ...spx, source: "yahoo" },
  };
}

// Standalone runner
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchBenchmarks()
    .then((data) => {
      writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
      console.log(`[benchmarks] Wrote ${OUT_PATH}`);
      console.log(
        `  BTC $${data.btc.price?.toFixed(0) ?? "—"} (${data.btc.change_pct_24h?.toFixed(2) ?? "—"}%)`,
      );
      console.log(
        `  ETH $${data.eth.price?.toFixed(0) ?? "—"} (${data.eth.change_pct_24h?.toFixed(2) ?? "—"}%)`,
      );
      console.log(
        `  SPX $${data.spx.price?.toFixed(0) ?? "—"} (${data.spx.change_pct_24h?.toFixed(2) ?? "—"}%)`,
      );
    })
    .catch((err) => {
      console.error("[benchmarks] Failed:", err);
      process.exit(1);
    });
}
