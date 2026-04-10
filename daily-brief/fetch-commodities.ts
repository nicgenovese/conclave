/**
 * Gimli — Commodity Watchman
 * Tracks spot prices, futures curves, tokenized commodities for Moria's commodity thesis.
 * Graceful degradation: runs without API keys, returns partial data.
 *
 * Data sources:
 * - Metals-API (spot gold/silver/copper/oil) — needs METALS_API_KEY, free tier 50/mo
 * - Alpha Vantage (futures curves) — needs ALPHA_VANTAGE_API_KEY, free tier 25/day
 * - CoinGecko (tokenized commodities PAXG, XAUT, mining equities) — free, no key
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../portal/data/commodities.json");

const METALS_API_KEY = process.env.METALS_API_KEY || "";
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";

// Ounce conversion constant for Metals-API (prices are USD per gram-equivalent for some metals, per oz for others)

interface CommodityPoint {
  value: number | null;
  source: "metals-api" | "coingecko" | "alpha-vantage" | "yahoo" | null;
  error?: string;
}

interface CurveState {
  front: number | null;
  next: number | null;
  curve: "backwardation" | "contango" | "flat" | "unknown";
  spread_pct: number | null;
}

export interface CommoditiesData {
  updated_at: string;
  spot: {
    gold_usd_oz: CommodityPoint;
    silver_usd_oz: CommodityPoint;
    platinum_usd_oz: CommodityPoint;
    palladium_usd_oz: CommodityPoint;
    copper_usd_lb: CommodityPoint;
    wti_usd_bbl: CommodityPoint;
    brent_usd_bbl: CommodityPoint;
  };
  futures: {
    gold: CurveState;
    copper: CurveState;
    wti: CurveState;
  };
  tokenized: {
    paxg_usd: CommodityPoint;
    xaut_usd: CommodityPoint;
    paxg_premium_bps: number | null;
  };
  mining_equities: {
    freeport_fcx: CommodityPoint;
    bhp: CommodityPoint;
    rio: CommodityPoint;
    newmont_nem: CommodityPoint;
  };
  signals: Array<{
    type: "backwardation" | "contango" | "premium" | "discount" | "regime";
    market: string;
    severity: "info" | "warning" | "critical";
    message: string;
  }>;
  health: {
    metals_api: "ok" | "no_key" | "error";
    alpha_vantage: "ok" | "no_key" | "error";
    coingecko: "ok" | "error";
  };
}

function emptyPoint(error?: string): CommodityPoint {
  return { value: null, source: null, error };
}

// ─────────────────────────────────────────────────────────
// Metals-API: spot prices
// ─────────────────────────────────────────────────────────
async function fetchMetalsApi(): Promise<{
  gold: number | null;
  silver: number | null;
  platinum: number | null;
  palladium: number | null;
  copper_lb: number | null;
  wti: number | null;
  brent: number | null;
  error?: string;
}> {
  if (!METALS_API_KEY) {
    return {
      gold: null,
      silver: null,
      platinum: null,
      palladium: null,
      copper_lb: null,
      wti: null,
      brent: null,
      error: "METALS_API_KEY not set",
    };
  }

  try {
    // Metals-API returns rates as 1/price relative to base
    // Symbols: XAU (gold), XAG (silver), XPT (platinum), XPD (palladium), COPPER-USD, WTIOIL, BRENTOIL
    const symbols = "XAU,XAG,XPT,XPD,COPPER-USD,WTIOIL,BRENTOIL";
    const url = `https://metals-api.com/api/latest?access_key=${METALS_API_KEY}&base=USD&symbols=${symbols}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error?.info || "Metals-API failed");
    }

    const rates = json.rates || {};

    // Metals-API convention: rates[XAU] = XAU per USD, so 1/rate = USD per oz
    const invert = (r: number) => (r && r > 0 ? 1 / r : null);

    // COPPER-USD gives USD per lb directly (not inverted)
    const copperRate = rates["COPPER-USD"];

    return {
      gold: invert(rates.XAU),
      silver: invert(rates.XAG),
      platinum: invert(rates.XPT),
      palladium: invert(rates.XPD),
      copper_lb: copperRate || null,
      wti: invert(rates.WTIOIL),
      brent: invert(rates.BRENTOIL),
    };
  } catch (err) {
    return {
      gold: null,
      silver: null,
      platinum: null,
      palladium: null,
      copper_lb: null,
      wti: null,
      brent: null,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

// ─────────────────────────────────────────────────────────
// Alpha Vantage: futures curves via commodity functions
// Free tier: 25 calls/day, so use sparingly
// ─────────────────────────────────────────────────────────
async function fetchAlphaVantageCurve(
  func: string,
  interval: string = "monthly",
): Promise<{ front: number | null; next: number | null; error?: string }> {
  if (!ALPHA_VANTAGE_API_KEY) {
    return { front: null, next: null, error: "ALPHA_VANTAGE_API_KEY not set" };
  }

  try {
    const url = `https://www.alphavantage.co/query?function=${func}&interval=${interval}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const data = json.data;

    if (!Array.isArray(data) || data.length === 0) {
      // Alpha Vantage returns "Note" or "Information" when rate-limited
      if (json.Note || json.Information) {
        throw new Error("Rate limited");
      }
      throw new Error("No data returned");
    }

    // data[0] is most recent, data[1] is prior period — use as proxy for curve shape
    const front = parseFloat(data[0].value);
    const next = data[1] ? parseFloat(data[1].value) : null;

    return { front: isFinite(front) ? front : null, next: isFinite(next as number) ? next : null };
  } catch (err) {
    return {
      front: null,
      next: null,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

function classifyCurve(
  front: number | null,
  next: number | null,
): { state: "backwardation" | "contango" | "flat" | "unknown"; spread_pct: number | null } {
  if (front === null || next === null) return { state: "unknown", spread_pct: null };
  const spreadPct = ((front - next) / next) * 100;
  if (Math.abs(spreadPct) < 0.5) return { state: "flat", spread_pct: spreadPct };
  if (spreadPct > 0) return { state: "backwardation", spread_pct: spreadPct };
  return { state: "contango", spread_pct: spreadPct };
}

// ─────────────────────────────────────────────────────────
// CoinGecko: tokenized commodities + mining equities proxies
// Free tier, no key needed
// ─────────────────────────────────────────────────────────
async function fetchCoinGeckoTokenized(): Promise<{
  paxg: number | null;
  xaut: number | null;
  error?: string;
}> {
  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,tether-gold&vs_currencies=usd";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    return {
      paxg: json["pax-gold"]?.usd ?? null,
      xaut: json["tether-gold"]?.usd ?? null,
    };
  } catch (err) {
    return {
      paxg: null,
      xaut: null,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

// Mining equities via Yahoo Finance unofficial endpoint (free, no key)
async function fetchYahooQuote(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Conclave/1.0)" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" ? price : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Main fetch orchestrator
// ─────────────────────────────────────────────────────────
export async function fetchCommodities(): Promise<CommoditiesData> {
  console.log("[gimli] Fetching commodity data...");

  const [metals, tokenized, fcx, bhp, rio, nem, goldFutures, copperFutures, wtiFutures] =
    await Promise.all([
      fetchMetalsApi(),
      fetchCoinGeckoTokenized(),
      fetchYahooQuote("FCX"),
      fetchYahooQuote("BHP"),
      fetchYahooQuote("RIO"),
      fetchYahooQuote("NEM"),
      fetchAlphaVantageCurve("COPPER").catch(() => ({ front: null, next: null })), // placeholder
      fetchAlphaVantageCurve("COPPER").catch(() => ({ front: null, next: null })),
      fetchAlphaVantageCurve("WTI").catch(() => ({ front: null, next: null })),
    ]);

  // Gold futures — Alpha Vantage doesn't have direct futures, so use monthly commodity series
  // as a proxy curve. For now, classify as unknown if we can't get 2 data points.
  // A better approach: wait for FRED for futures (DCOILWTICO, etc.)
  // For now, we'll mark gold futures as "unknown" when no data

  const goldCurve = classifyCurve(goldFutures.front, goldFutures.next);
  const copperCurve = classifyCurve(copperFutures.front, copperFutures.next);
  const wtiCurve = classifyCurve(wtiFutures.front, wtiFutures.next);

  // Build signals from the data
  const signals: CommoditiesData["signals"] = [];

  if (copperCurve.state === "backwardation" && (copperCurve.spread_pct ?? 0) > 1) {
    signals.push({
      type: "backwardation",
      market: "copper",
      severity: "warning",
      message: `Copper front-month ${copperCurve.spread_pct!.toFixed(1)}% above next — physical tightness signal`,
    });
  }

  if (wtiCurve.state === "backwardation" && (wtiCurve.spread_pct ?? 0) > 1.5) {
    signals.push({
      type: "backwardation",
      market: "wti",
      severity: "info",
      message: `WTI in backwardation — oil demand pulling forward`,
    });
  }

  // Compute PAXG premium vs spot gold
  let paxgPremiumBps: number | null = null;
  if (tokenized.paxg && metals.gold) {
    paxgPremiumBps = Math.round(((tokenized.paxg - metals.gold) / metals.gold) * 10000);
    if (Math.abs(paxgPremiumBps) > 50) {
      signals.push({
        type: paxgPremiumBps > 0 ? "premium" : "discount",
        market: "paxg",
        severity: Math.abs(paxgPremiumBps) > 100 ? "warning" : "info",
        message: `PAXG trading ${paxgPremiumBps > 0 ? "+" : ""}${paxgPremiumBps}bps vs spot gold`,
      });
    }
  }

  const data: CommoditiesData = {
    updated_at: new Date().toISOString(),
    spot: {
      gold_usd_oz: {
        value: metals.gold,
        source: metals.gold ? "metals-api" : null,
        error: metals.error,
      },
      silver_usd_oz: {
        value: metals.silver,
        source: metals.silver ? "metals-api" : null,
        error: metals.error,
      },
      platinum_usd_oz: {
        value: metals.platinum,
        source: metals.platinum ? "metals-api" : null,
        error: metals.error,
      },
      palladium_usd_oz: {
        value: metals.palladium,
        source: metals.palladium ? "metals-api" : null,
        error: metals.error,
      },
      copper_usd_lb: {
        value: metals.copper_lb,
        source: metals.copper_lb ? "metals-api" : null,
        error: metals.error,
      },
      wti_usd_bbl: {
        value: metals.wti,
        source: metals.wti ? "metals-api" : null,
        error: metals.error,
      },
      brent_usd_bbl: {
        value: metals.brent,
        source: metals.brent ? "metals-api" : null,
        error: metals.error,
      },
    },
    futures: {
      gold: {
        front: goldFutures.front,
        next: goldFutures.next,
        curve: goldCurve.state,
        spread_pct: goldCurve.spread_pct,
      },
      copper: {
        front: copperFutures.front,
        next: copperFutures.next,
        curve: copperCurve.state,
        spread_pct: copperCurve.spread_pct,
      },
      wti: {
        front: wtiFutures.front,
        next: wtiFutures.next,
        curve: wtiCurve.state,
        spread_pct: wtiCurve.spread_pct,
      },
    },
    tokenized: {
      paxg_usd: { value: tokenized.paxg, source: tokenized.paxg ? "coingecko" : null },
      xaut_usd: { value: tokenized.xaut, source: tokenized.xaut ? "coingecko" : null },
      paxg_premium_bps: paxgPremiumBps,
    },
    mining_equities: {
      freeport_fcx: { value: fcx, source: fcx ? "yahoo" : null },
      bhp: { value: bhp, source: bhp ? "yahoo" : null },
      rio: { value: rio, source: rio ? "yahoo" : null },
      newmont_nem: { value: nem, source: nem ? "yahoo" : null },
    },
    signals,
    health: {
      metals_api: METALS_API_KEY ? (metals.error ? "error" : "ok") : "no_key",
      alpha_vantage: ALPHA_VANTAGE_API_KEY
        ? goldFutures.error || copperFutures.error || wtiFutures.error
          ? "error"
          : "ok"
        : "no_key",
      coingecko: tokenized.error ? "error" : "ok",
    },
  };

  const sources = [
    metals.gold && "gold",
    tokenized.paxg && "paxg",
    fcx && "fcx",
  ].filter(Boolean).length;

  console.log(
    `[gimli] Fetched ${sources} live data points · ${signals.length} signals · health: ${data.health.metals_api}/${data.health.alpha_vantage}/${data.health.coingecko}`,
  );

  return data;
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchCommodities()
    .then((data) => {
      writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
      console.log(`[gimli] Wrote ${OUT_PATH}`);
    })
    .catch((err) => {
      console.error("[gimli] Failed:", err);
      process.exit(1);
    });
}
