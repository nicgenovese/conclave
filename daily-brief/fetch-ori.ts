/**
 * Ori — The Truth Agent (Tier 1, Deterministic, Zero-LLM)
 *
 * Ori is the canonical "what do we own and what is it worth" source.
 * Every number Ori produces is traceable to a raw API response.
 * No AI, no interpretation — just deterministic code against public APIs.
 *
 * Responsibilities (folded in from the old portfolio + wallet + balin agents):
 *  1. Wallet balances — Etherscan V2 multichain (ETH/Base/Arbitrum/Optimism/Polygon/BSC)
 *  2. Spot token prices — DeFi Llama /prices/current/ (no key, replaces CoinGecko)
 *  3. Live perp positions — Hyperliquid clearinghouseState (no key)
 *  4. Commodity spot data — Yahoo Finance futures endpoints (no key)
 *  5. Deterministic rules — stop-loss proximity, concentration limits, stale data
 *
 * Outputs: portal/data/ori.json — canonical portfolio + risk + commodities snapshot.
 *
 * Wave 1: Etherscan V2 is STUBBED (ETH mainnet only without key).
 * Wave 2: Etherscan V2 multichain activated when ETHERSCAN_API_KEY is set.
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { WATCHLIST, getAllDeFiLlamaCoins, Protocol } from "./lib/watchlist.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../portal/data/ori.json");
const PORTFOLIO_LEGACY = resolve(__dirname, "../portal/data/portfolio.json");

const WALLET_ADDRESS = process.env.WALLET_ADDRESS || "0x08fC70ADf6B0950749b7647F67616589b1853A53";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

// ─────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────

export interface OriPosition {
  ticker: string;
  name: string;
  theme: string;
  bucket: string;
  chain: string;
  balance: number | null;          // in tokens
  price_usd: number | null;         // from DeFi Llama
  value_usd: number | null;         // balance × price
  allocation_pct: number | null;    // value / NAV × 100
  pnl_pct?: number;                 // reserved for future cost-basis tracking
  source: "etherscan" | "hyperliquid" | "manual" | "none";
}

export interface OriPerp {
  pair: string;
  side: "long" | "short" | "none";
  leverage: number;
  size_usd: number;
  entry_price: number | null;
  mark_price: number | null;
  liquidation_price: number | null;
  unrealized_pnl_usd: number | null;
  stop_loss: number | null;         // from manual config if present
  distance_to_stop_pct: number | null;
  source: "hyperliquid" | "manual" | "none";
}

export interface OriCommodityPoint {
  value: number | null;
  change_pct_24h: number | null;
  source: "yahoo" | "defillama" | "none";
}

export interface OriCommodities {
  gold_usd_oz: OriCommodityPoint;
  silver_usd_oz: OriCommodityPoint;
  copper_usd_lb: OriCommodityPoint;
  wti_usd_bbl: OriCommodityPoint;
  brent_usd_bbl: OriCommodityPoint;
  paxg_usd: OriCommodityPoint;        // tokenized gold from DeFi Llama
  xaut_usd: OriCommodityPoint;        // Tether Gold from DeFi Llama
  mining_equities: {
    fcx: OriCommodityPoint;
    bhp: OriCommodityPoint;
    rio: OriCommodityPoint;
    nem: OriCommodityPoint;
  };
}

export interface OriAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  type: "stop_loss" | "concentration" | "stale_data" | "missing_data";
  position?: string;
  title: string;
  message: string;
  created: string;
}

export interface OriData {
  updated_at: string;
  wallet_address: string;
  nav_usd: number;
  positions: OriPosition[];
  perps: OriPerp[];
  commodities: OriCommodities;
  alerts: OriAlert[];
  concentration: {
    max_position_pct: number;
    max_position_ticker: string;
    limit: number;
    breach: boolean;
  };
  health: {
    etherscan: "ok" | "no_key" | "error" | "stub";
    defillama: "ok" | "error";
    hyperliquid: "ok" | "error";
    yahoo: "ok" | "error";
    stale: boolean;
  };
  // Legacy-compat shape for dashboard consumers still reading portfolio.json fields
  legacy_shape: {
    nav: number;
    updated_at: string;
    wallet: string;
    positions: Array<{
      name: string;
      ticker: string;
      allocation_usd: number;
      allocation_pct: number;
      bucket: string;
      pnl_pct?: number;
      notes?: string;
    }>;
    perps: Array<{
      pair: string;
      leverage: number;
      capital_usd: number;
      entry_1: number;
      entry_2: number;
      stop: number;
    }>;
    total_perp_exposure: number;
    avg_leverage: number;
    max_perp_loss: number;
    allocation_buckets: Array<{
      name: string;
      total_usd: number;
      pct: number;
      color: string;
    }>;
  };
}

// ─────────────────────────────────────────────────────────
// DeFi Llama: prices (no key)
// ─────────────────────────────────────────────────────────

interface DeFiLlamaPriceResponse {
  coins: Record<
    string,
    {
      decimals?: number;
      symbol: string;
      price: number;
      timestamp: number;
      confidence: number;
    }
  >;
}

async function fetchDeFiLlamaPrices(coinIds: string[]): Promise<Record<string, number>> {
  if (coinIds.length === 0) return {};

  // Chunk to avoid URL length limits
  const CHUNK = 50;
  const prices: Record<string, number> = {};

  for (let i = 0; i < coinIds.length; i += CHUNK) {
    const chunk = coinIds.slice(i, i + CHUNK);
    const url = `https://coins.llama.fi/prices/current/${chunk.join(",")}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[ori] DeFi Llama price fetch failed: ${res.status}`);
        continue;
      }
      const data = (await res.json()) as DeFiLlamaPriceResponse;
      for (const [key, val] of Object.entries(data.coins || {})) {
        if (val?.price) prices[key] = val.price;
      }
    } catch (err) {
      console.warn(`[ori] DeFi Llama chunk error:`, err instanceof Error ? err.message : err);
    }
  }

  return prices;
}

// ─────────────────────────────────────────────────────────
// Hyperliquid: live perp positions (public, no key)
// ─────────────────────────────────────────────────────────

interface HyperliquidClearinghouseState {
  assetPositions: Array<{
    position: {
      coin: string;
      szi: string;
      leverage: { type: string; value: number };
      entryPx?: string;
      positionValue?: string;
      unrealizedPnl?: string;
      liquidationPx?: string;
    };
  }>;
  marginSummary?: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
}

async function fetchHyperliquidPerps(): Promise<{
  perps: OriPerp[];
  account_value_usd: number;
  error?: string;
}> {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "clearinghouseState",
        user: WALLET_ADDRESS,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as HyperliquidClearinghouseState;
    const accountValue = parseFloat(data.marginSummary?.accountValue || "0");

    const perps: OriPerp[] = (data.assetPositions || [])
      .filter((ap) => ap.position && parseFloat(ap.position.szi) !== 0)
      .map((ap) => {
        const p = ap.position;
        const size = parseFloat(p.szi);
        const entry = p.entryPx ? parseFloat(p.entryPx) : null;
        const liq = p.liquidationPx ? parseFloat(p.liquidationPx) : null;
        const sizeUsd = p.positionValue ? parseFloat(p.positionValue) : 0;
        const pnl = p.unrealizedPnl ? parseFloat(p.unrealizedPnl) : 0;

        return {
          pair: `${p.coin}-PERP`,
          side: size > 0 ? "long" : size < 0 ? "short" : "none",
          leverage: p.leverage?.value || 1,
          size_usd: Math.abs(sizeUsd),
          entry_price: entry,
          mark_price: entry && sizeUsd !== 0 ? sizeUsd / Math.abs(size) : null,
          liquidation_price: liq,
          unrealized_pnl_usd: pnl,
          stop_loss: null,
          distance_to_stop_pct: null,
          source: "hyperliquid",
        };
      });

    console.log(`[ori] Hyperliquid: account value $${accountValue.toFixed(0)}, ${perps.length} open perps`);

    return { perps, account_value_usd: accountValue };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.warn(`[ori] Hyperliquid fetch failed: ${msg}`);
    return { perps: [], account_value_usd: 0, error: msg };
  }
}

// ─────────────────────────────────────────────────────────
// Etherscan V2: multichain balance (stubbed until key)
// ─────────────────────────────────────────────────────────

const CHAINS = [
  { id: 1, name: "ethereum" },
  { id: 8453, name: "base" },
  { id: 42161, name: "arbitrum" },
  { id: 10, name: "optimism" },
  { id: 137, name: "polygon" },
  { id: 56, name: "bsc" },
];

async function fetchEtherscanMultichainBalance(): Promise<{
  chains: Record<string, number>; // chain name → ETH-equivalent balance
  error?: string;
}> {
  if (!ETHERSCAN_API_KEY) {
    // Wave 1: single-chain public endpoint fallback (ETH mainnet only, no auth)
    try {
      const url = `https://api.etherscan.io/api?module=account&action=balance&address=${WALLET_ADDRESS}&tag=latest`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== "1") {
        return { chains: {}, error: `public endpoint returned: ${data.message || "unknown"}` };
      }
      const wei = BigInt(data.result || "0");
      const eth = Number(wei) / 1e18;
      return { chains: { ethereum: eth }, error: undefined };
    } catch (err) {
      return {
        chains: {},
        error: err instanceof Error ? err.message : "public fallback failed",
      };
    }
  }

  // Wave 2: Etherscan V2 unified multichain (activated when key is set)
  const chains: Record<string, number> = {};
  for (const chain of CHAINS) {
    try {
      const url = `https://api.etherscan.io/v2/api?chainid=${chain.id}&module=account&action=balance&address=${WALLET_ADDRESS}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === "1" && data.result) {
        const wei = BigInt(data.result);
        chains[chain.name] = Number(wei) / 1e18;
      }
    } catch {
      // skip this chain, continue with others
    }
  }
  return { chains };
}

// ─────────────────────────────────────────────────────────
// Yahoo Finance: commodity spot data (no key)
// ─────────────────────────────────────────────────────────

async function fetchYahooQuote(symbol: string): Promise<{
  price: number | null;
  change_pct: number | null;
}> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Conclave/1.0)" },
    });
    if (!res.ok) return { price: null, change_pct: null };
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return { price: null, change_pct: null };

    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose;
    const change_pct = prev && price ? ((price - prev) / prev) * 100 : null;

    return {
      price: typeof price === "number" ? price : null,
      change_pct,
    };
  } catch {
    return { price: null, change_pct: null };
  }
}

async function fetchCommodities(
  llamaPrices: Record<string, number>,
): Promise<OriCommodities> {
  const [gold, silver, copper, wti, brent, fcx, bhp, rio, nem] = await Promise.all([
    fetchYahooQuote("GC=F"),
    fetchYahooQuote("SI=F"),
    fetchYahooQuote("HG=F"),
    fetchYahooQuote("CL=F"),
    fetchYahooQuote("BZ=F"),
    fetchYahooQuote("FCX"),
    fetchYahooQuote("BHP"),
    fetchYahooQuote("RIO"),
    fetchYahooQuote("NEM"),
  ]);

  const mk = (q: { price: number | null; change_pct: number | null }): OriCommodityPoint => ({
    value: q.price,
    change_pct_24h: q.change_pct,
    source: q.price !== null ? "yahoo" : "none",
  });

  const paxgPrice = llamaPrices["coingecko:pax-gold"] || null;
  const xautPrice = llamaPrices["coingecko:tether-gold"] || null;

  return {
    gold_usd_oz: mk(gold),
    silver_usd_oz: mk(silver),
    copper_usd_lb: mk(copper),
    wti_usd_bbl: mk(wti),
    brent_usd_bbl: mk(brent),
    paxg_usd: {
      value: paxgPrice,
      change_pct_24h: null,
      source: paxgPrice ? "defillama" : "none",
    },
    xaut_usd: {
      value: xautPrice,
      change_pct_24h: null,
      source: xautPrice ? "defillama" : "none",
    },
    mining_equities: {
      fcx: mk(fcx),
      bhp: mk(bhp),
      rio: mk(rio),
      nem: mk(nem),
    },
  };
}

// ─────────────────────────────────────────────────────────
// Deterministic rules (absorbed from Balin)
// ─────────────────────────────────────────────────────────

const CONCENTRATION_LIMIT_PCT = 30;
const CONCENTRATION_WARNING_PCT = 25;
const STOP_LOSS_CRITICAL_PCT = 5;
const STOP_LOSS_WARNING_PCT = 10;
const STALE_HOURS = 24;

function computeAlerts(
  positions: OriPosition[],
  perps: OriPerp[],
  nav: number,
  previouslyUpdated: string | null,
): {
  alerts: OriAlert[];
  concentration: OriData["concentration"];
} {
  const alerts: OriAlert[] = [];
  const now = new Date().toISOString();

  // Concentration
  let maxPct = 0;
  let maxTicker = "";
  for (const p of positions) {
    if (p.allocation_pct !== null && p.allocation_pct > maxPct) {
      maxPct = p.allocation_pct;
      maxTicker = p.ticker;
    }
  }

  const concentration: OriData["concentration"] = {
    max_position_pct: maxPct,
    max_position_ticker: maxTicker,
    limit: CONCENTRATION_LIMIT_PCT,
    breach: maxPct > CONCENTRATION_LIMIT_PCT,
  };

  if (maxPct > CONCENTRATION_LIMIT_PCT) {
    alerts.push({
      id: "concentration-max",
      severity: "warning",
      type: "concentration",
      position: maxTicker,
      title: `${maxTicker} concentration limit breached`,
      message: `${maxTicker} is ${maxPct.toFixed(1)}% of NAV, above the ${CONCENTRATION_LIMIT_PCT}% limit.`,
      created: now,
    });
  } else if (maxPct > CONCENTRATION_WARNING_PCT) {
    alerts.push({
      id: "concentration-max",
      severity: "info",
      type: "concentration",
      position: maxTicker,
      title: `${maxTicker} approaching concentration limit`,
      message: `${maxTicker} is ${maxPct.toFixed(1)}% of NAV (limit: ${CONCENTRATION_LIMIT_PCT}%).`,
      created: now,
    });
  }

  // Stop loss proximity (only if Hyperliquid gave us both mark and liquidation)
  for (const perp of perps) {
    if (
      perp.mark_price !== null &&
      perp.liquidation_price !== null &&
      perp.side !== "none"
    ) {
      const pct =
        perp.side === "long"
          ? ((perp.mark_price - perp.liquidation_price) / perp.mark_price) * 100
          : ((perp.liquidation_price - perp.mark_price) / perp.mark_price) * 100;

      if (pct <= STOP_LOSS_CRITICAL_PCT) {
        alerts.push({
          id: `liq-${perp.pair}`,
          severity: "critical",
          type: "stop_loss",
          position: perp.pair,
          title: `${perp.pair} very close to liquidation`,
          message: `${pct.toFixed(1)}% to liquidation at $${perp.liquidation_price.toFixed(2)}.`,
          created: now,
        });
      } else if (pct <= STOP_LOSS_WARNING_PCT) {
        alerts.push({
          id: `liq-${perp.pair}`,
          severity: "warning",
          type: "stop_loss",
          position: perp.pair,
          title: `${perp.pair} approaching liquidation`,
          message: `${pct.toFixed(1)}% to liquidation at $${perp.liquidation_price.toFixed(2)}.`,
          created: now,
        });
      }
    }
  }

  // Stale data check (only informational, we refresh on every run)
  if (previouslyUpdated) {
    try {
      const diff = Date.now() - new Date(previouslyUpdated).getTime();
      if (diff > STALE_HOURS * 60 * 60 * 1000) {
        alerts.push({
          id: "stale-data",
          severity: "info",
          type: "stale_data",
          title: "Portfolio data was stale",
          message: `Previous update was ${Math.round(diff / 3600000)}h ago.`,
          created: now,
        });
      }
    } catch {
      // ignore
    }
  }

  return { alerts, concentration };
}

// ─────────────────────────────────────────────────────────
// Legacy portfolio.json shape — keep dashboard compat
// ─────────────────────────────────────────────────────────

function readPreviousPortfolio(): {
  positions: Array<{
    ticker: string;
    name: string;
    bucket: string;
    balance?: number;
    notes?: string;
  }>;
  perpStopLosses: Record<string, number>;
  previouslyUpdated: string | null;
} {
  const defaultState = { positions: [], perpStopLosses: {}, previouslyUpdated: null };

  try {
    if (!existsSync(PORTFOLIO_LEGACY)) return defaultState;
    const raw = readFileSync(PORTFOLIO_LEGACY, "utf-8");
    const parsed = JSON.parse(raw);

    const positions = (parsed.positions || []).map((p: any) => ({
      ticker: p.ticker,
      name: p.name,
      bucket: p.bucket || "Unassigned",
      // Estimate balance from allocation_usd when explicit balance absent
      balance: undefined, // we'll recompute from current prices
      notes: p.notes,
    }));

    const perpStopLosses: Record<string, number> = {};
    for (const perp of parsed.perps || []) {
      if (perp.pair && perp.stop) perpStopLosses[perp.pair] = perp.stop;
    }

    return {
      positions,
      perpStopLosses,
      previouslyUpdated: parsed.updated_at || null,
    };
  } catch (err) {
    console.warn("[ori] Could not read legacy portfolio.json:", err instanceof Error ? err.message : err);
    return defaultState;
  }
}

// ─────────────────────────────────────────────────────────
// Main orchestrator
// ─────────────────────────────────────────────────────────

export async function fetchOri(): Promise<OriData> {
  console.log("[ori] Starting deterministic truth scan...");

  const prev = readPreviousPortfolio();

  // Fetch prices, perps, commodities, multichain balance in parallel
  const coinIds = getAllDeFiLlamaCoins();
  // Also include commodity tokens and lookups Gimli + dashboard may need
  const commodityCoins = ["coingecko:pax-gold", "coingecko:tether-gold"];
  const allCoinIds = Array.from(new Set([...coinIds, ...commodityCoins]));

  const [llamaPrices, hyperliquidResult, etherscanResult] = await Promise.all([
    fetchDeFiLlamaPrices(allCoinIds),
    fetchHyperliquidPerps(),
    fetchEtherscanMultichainBalance(),
  ]);

  const commodities = await fetchCommodities(llamaPrices);

  // Build positions — match watchlist entries with prices from DeFi Llama
  // For now, positions are driven by the previous portfolio.json's ticker list.
  // We compute value = balance × current_price. If we don't have a balance,
  // we use the legacy allocation_usd as a proxy until Etherscan V2 is wired.
  const positions: OriPosition[] = [];
  const prevRaw = readPreviousPortfolioRaw();

  for (const prevPos of prevRaw.positions) {
    const wlEntry = WATCHLIST.find(
      (p) => p.ticker.toUpperCase() === prevPos.ticker.toUpperCase(),
    );

    const coinId = wlEntry?.defillama_coin || (wlEntry?.coingecko_id ? `coingecko:${wlEntry.coingecko_id}` : null);
    const priceUsd = coinId ? llamaPrices[coinId] ?? null : null;

    // Wave 1 fallback: no balance tracking yet, use legacy allocation_usd as value
    const valueUsd = prevPos.allocation_usd ?? null;
    const balance = priceUsd && valueUsd ? valueUsd / priceUsd : null;

    positions.push({
      ticker: prevPos.ticker,
      name: prevPos.name || prevPos.ticker,
      theme: wlEntry?.theme || "Portfolio",
      bucket: prevPos.bucket || "Unassigned",
      chain: wlEntry?.chain || "ethereum",
      balance,
      price_usd: priceUsd,
      value_usd: valueUsd,
      allocation_pct: prevPos.allocation_pct ?? null,
      pnl_pct: prevPos.pnl_pct,
      source: "manual",
    });
  }

  // NAV = sum of position values + Hyperliquid account value
  const positionsValue = positions.reduce((sum, p) => sum + (p.value_usd || 0), 0);
  const nav = positionsValue + hyperliquidResult.account_value_usd;

  // Recompute allocation percentages based on NAV
  for (const p of positions) {
    if (p.value_usd !== null && nav > 0) {
      p.allocation_pct = (p.value_usd / nav) * 100;
    }
  }

  // Wire stop losses from previous config into Hyperliquid perps
  const perps = hyperliquidResult.perps.map((perp) => {
    const stop = prev.perpStopLosses[perp.pair];
    if (stop) perp.stop_loss = stop;
    if (stop && perp.mark_price) {
      perp.distance_to_stop_pct =
        perp.side === "long"
          ? ((perp.mark_price - stop) / perp.mark_price) * 100
          : ((stop - perp.mark_price) / perp.mark_price) * 100;
    }
    return perp;
  });

  // If Hyperliquid returned nothing, fall back to legacy manual perp config
  let finalPerps: OriPerp[] = perps;
  if (finalPerps.length === 0 && prevRaw.legacyPerps.length > 0) {
    finalPerps = prevRaw.legacyPerps.map((lp): OriPerp => {
      const priceCoin = WATCHLIST.find((p) => lp.pair.toUpperCase().startsWith(p.ticker.toUpperCase()));
      const coinId = priceCoin?.defillama_coin || (priceCoin?.coingecko_id ? `coingecko:${priceCoin.coingecko_id}` : null);
      const markPrice = coinId ? llamaPrices[coinId] ?? null : null;
      const entry = (lp.entry_1 + lp.entry_2) / 2;
      const distance = markPrice && lp.stop ? ((markPrice - lp.stop) / markPrice) * 100 : null;
      return {
        pair: lp.pair,
        side: "long",
        leverage: lp.leverage,
        size_usd: lp.capital_usd * lp.leverage,
        entry_price: entry,
        mark_price: markPrice,
        liquidation_price: lp.stop,
        unrealized_pnl_usd: null,
        stop_loss: lp.stop,
        distance_to_stop_pct: distance,
        source: "manual",
      };
    });
  }

  const { alerts, concentration } = computeAlerts(positions, finalPerps, nav, prev.previouslyUpdated);

  // Health checks
  const llamaOk = Object.keys(llamaPrices).length > 0;
  const etherscanStatus: "ok" | "no_key" | "error" | "stub" =
    ETHERSCAN_API_KEY
      ? etherscanResult.error
        ? "error"
        : "ok"
      : etherscanResult.error
        ? "error"
        : "stub";

  // Legacy shape for dashboard
  const legacyBucketTotals: Record<string, number> = {};
  for (const p of positions) {
    if (!p.value_usd) continue;
    legacyBucketTotals[p.bucket] = (legacyBucketTotals[p.bucket] || 0) + p.value_usd;
  }
  const bucketColors: Record<string, string> = {
    Core: "#3b82f6",
    "DeFi Value": "#8b5cf6",
    Yield: "#10b981",
    Emerging: "#f59e0b",
    Gas: "#6b7280",
    Perps: "#ef4444",
  };
  const allocation_buckets = Object.entries(legacyBucketTotals).map(([name, total]) => ({
    name,
    total_usd: total,
    pct: nav > 0 ? (total / nav) * 100 : 0,
    color: bucketColors[name] || "#6b7280",
  }));

  const totalPerpExposure = finalPerps.reduce((sum, p) => sum + p.size_usd, 0);
  const avgLeverage =
    finalPerps.length > 0
      ? finalPerps.reduce((sum, p) => sum + p.leverage, 0) / finalPerps.length
      : 0;
  const maxPerpLoss = finalPerps.reduce((sum, p) => {
    if (p.stop_loss && p.entry_price && p.leverage) {
      const lossPct = Math.abs((p.entry_price - p.stop_loss) / p.entry_price);
      const capital = p.size_usd / p.leverage;
      return sum + capital * lossPct * p.leverage;
    }
    return sum;
  }, 0);

  const data: OriData = {
    updated_at: new Date().toISOString(),
    wallet_address: WALLET_ADDRESS,
    nav_usd: nav,
    positions,
    perps: finalPerps,
    commodities,
    alerts,
    concentration,
    health: {
      etherscan: etherscanStatus,
      defillama: llamaOk ? "ok" : "error",
      hyperliquid: hyperliquidResult.error ? "error" : "ok",
      yahoo: commodities.gold_usd_oz.value !== null ? "ok" : "error",
      stale: false, // just refreshed
    },
    legacy_shape: {
      nav,
      updated_at: new Date().toISOString().slice(0, 10),
      wallet: WALLET_ADDRESS,
      positions: positions.map((p) => ({
        name: p.name,
        ticker: p.ticker,
        allocation_usd: p.value_usd ?? 0,
        allocation_pct: p.allocation_pct ?? 0,
        bucket: p.bucket,
        pnl_pct: p.pnl_pct,
      })),
      perps: finalPerps.map((p) => ({
        pair: p.pair,
        leverage: p.leverage,
        capital_usd: p.size_usd / Math.max(1, p.leverage),
        entry_1: p.entry_price ?? 0,
        entry_2: p.entry_price ?? 0,
        stop: p.stop_loss ?? 0,
      })),
      total_perp_exposure: totalPerpExposure,
      avg_leverage: avgLeverage,
      max_perp_loss: maxPerpLoss,
      allocation_buckets,
    },
  };

  console.log(
    `[ori] ✓ NAV $${nav.toFixed(0)} · ${positions.length} positions · ${finalPerps.length} perps · ${alerts.length} alerts · etherscan:${etherscanStatus} defillama:${data.health.defillama} hyperliquid:${data.health.hyperliquid}`,
  );

  return data;
}

// Helper to read legacy portfolio.json for backward compat
function readPreviousPortfolioRaw(): {
  positions: Array<{
    ticker: string;
    name: string;
    bucket: string;
    allocation_usd: number;
    allocation_pct: number;
    pnl_pct?: number;
    notes?: string;
  }>;
  legacyPerps: Array<{
    pair: string;
    leverage: number;
    capital_usd: number;
    entry_1: number;
    entry_2: number;
    stop: number;
  }>;
} {
  try {
    if (!existsSync(PORTFOLIO_LEGACY)) return { positions: [], legacyPerps: [] };
    const parsed = JSON.parse(readFileSync(PORTFOLIO_LEGACY, "utf-8"));
    return {
      positions: parsed.positions || [],
      legacyPerps: parsed.perps || [],
    };
  } catch {
    return { positions: [], legacyPerps: [] };
  }
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchOri()
    .then((data) => {
      writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
      console.log(`[ori] Wrote ${OUT_PATH}`);
    })
    .catch((err) => {
      console.error("[ori] Failed:", err);
      process.exit(1);
    });
}
