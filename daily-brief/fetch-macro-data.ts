/**
 * Elrond — Macro Sage
 * Tracks Fed rates, Treasury yields, CPI, unemployment, DXY, financial conditions via FRED.
 * Graceful degradation: without FRED_API_KEY it tries the public fredgraph endpoint (limited), then fallback.
 *
 * Data source:
 * - FRED (St. Louis Fed) — https://fred.stlouisfed.org/docs/api/fred/
 * - Free with instant signup, 120 requests/minute
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../portal/data/macro-data.json");

const FRED_API_KEY = process.env.FRED_API_KEY || "";

interface FredPoint {
  value: number | null;
  date: string | null;
  error?: string;
}

export interface MacroDataFull {
  updated_at: string;
  fed: {
    funds_rate: FredPoint;           // DFEDTARU — upper band
    balance_sheet_usd_bn: FredPoint; // WALCL — total assets
  };
  yields: {
    y2: FredPoint;          // DGS2
    y10: FredPoint;         // DGS10
    y30: FredPoint;         // DGS30
    real_10y: FredPoint;    // DFII10 — 10Y TIPS
    curve_2s10s_bps: number | null;
    inverted: boolean;
  };
  inflation: {
    cpi_yoy_pct: FredPoint;
    core_cpi_yoy_pct: FredPoint;
    trend: "declining" | "rising" | "stable" | "unknown";
  };
  employment: {
    unrate: FredPoint;      // UNRATE
    nfp_thousands: FredPoint; // PAYEMS MoM change
  };
  dollar: {
    dxy_proxy: FredPoint;   // DTWEXBGS — trade-weighted
  };
  financial_conditions: {
    nfci: FredPoint;        // NFCI — Chicago Fed
    regime: "loose" | "neutral" | "tight" | "unknown";
  };
  regime: "risk_on" | "risk_off" | "neutral" | "unknown";
  regime_summary: string;
  health: {
    fred: "ok" | "no_key" | "error";
  };
}

function emptyPoint(error?: string): FredPoint {
  return { value: null, date: null, error };
}

async function fetchFredSeries(seriesId: string): Promise<FredPoint> {
  if (!FRED_API_KEY) {
    return emptyPoint("FRED_API_KEY not set");
  }

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const obs = json.observations?.[0];

    if (!obs || obs.value === "." || obs.value === null) {
      return emptyPoint("no recent observation");
    }

    const value = parseFloat(obs.value);
    if (!isFinite(value)) return emptyPoint("invalid value");

    return { value, date: obs.date };
  } catch (err) {
    return emptyPoint(err instanceof Error ? err.message : "unknown");
  }
}

// Compute YoY percentage change for CPI-style series
async function fetchFredYoY(seriesId: string): Promise<FredPoint> {
  if (!FRED_API_KEY) return emptyPoint("FRED_API_KEY not set");

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=13`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const obs = json.observations || [];

    if (obs.length < 13) return emptyPoint("not enough history");

    const latest = parseFloat(obs[0].value);
    const yearAgo = parseFloat(obs[12].value);

    if (!isFinite(latest) || !isFinite(yearAgo) || yearAgo === 0) {
      return emptyPoint("bad history values");
    }

    const yoyPct = ((latest - yearAgo) / yearAgo) * 100;
    return { value: yoyPct, date: obs[0].date };
  } catch (err) {
    return emptyPoint(err instanceof Error ? err.message : "unknown");
  }
}

// Compute monthly change for jobs-style series
async function fetchFredMoMChange(seriesId: string): Promise<FredPoint> {
  if (!FRED_API_KEY) return emptyPoint("FRED_API_KEY not set");

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=2`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const obs = json.observations || [];
    if (obs.length < 2) return emptyPoint("not enough history");

    const latest = parseFloat(obs[0].value);
    const prior = parseFloat(obs[1].value);
    if (!isFinite(latest) || !isFinite(prior)) return emptyPoint("bad values");

    return { value: latest - prior, date: obs[0].date };
  } catch (err) {
    return emptyPoint(err instanceof Error ? err.message : "unknown");
  }
}

function classifyInflationTrend(cpi: FredPoint): "declining" | "rising" | "stable" | "unknown" {
  if (cpi.value === null) return "unknown";
  if (cpi.value < 2.5) return "declining";
  if (cpi.value > 3.5) return "rising";
  return "stable";
}

function classifyNfciRegime(nfci: FredPoint): "loose" | "neutral" | "tight" | "unknown" {
  if (nfci.value === null) return "unknown";
  if (nfci.value < -0.2) return "loose";
  if (nfci.value > 0.5) return "tight";
  return "neutral";
}

function classifyRegime(data: {
  nfci: FredPoint;
  curve2s10s: number | null;
  cpi: FredPoint;
  unrate: FredPoint;
}): { regime: "risk_on" | "risk_off" | "neutral" | "unknown"; summary: string } {
  const { nfci, curve2s10s, cpi, unrate } = data;

  if (nfci.value === null && curve2s10s === null && cpi.value === null) {
    return { regime: "unknown", summary: "FRED_API_KEY not set — add to enable macro regime detection" };
  }

  const signals: string[] = [];
  let riskOnScore = 0;

  // NFCI below zero = loose conditions = risk on
  if (nfci.value !== null) {
    if (nfci.value < -0.2) {
      riskOnScore += 2;
      signals.push("loose financial conditions");
    } else if (nfci.value > 0.5) {
      riskOnScore -= 2;
      signals.push("tight financial conditions");
    }
  }

  // Positive yield curve = risk on (normal)
  if (curve2s10s !== null) {
    if (curve2s10s > 20) {
      riskOnScore += 1;
      signals.push("yield curve steepening");
    } else if (curve2s10s < -50) {
      riskOnScore -= 2;
      signals.push("yield curve deeply inverted");
    } else if (curve2s10s < 0) {
      riskOnScore -= 1;
      signals.push("yield curve inverted");
    }
  }

  // CPI below 3% = friendly
  if (cpi.value !== null) {
    if (cpi.value < 3) {
      riskOnScore += 1;
      signals.push(`CPI ${cpi.value.toFixed(1)}% under target`);
    } else if (cpi.value > 4) {
      riskOnScore -= 1;
      signals.push(`CPI ${cpi.value.toFixed(1)}% elevated`);
    }
  }

  // Unemployment under 4.5% = healthy
  if (unrate.value !== null) {
    if (unrate.value < 4.5) {
      riskOnScore += 1;
    } else if (unrate.value > 5.5) {
      riskOnScore -= 1;
      signals.push(`unemployment rising (${unrate.value.toFixed(1)}%)`);
    }
  }

  let regime: "risk_on" | "risk_off" | "neutral";
  if (riskOnScore >= 2) regime = "risk_on";
  else if (riskOnScore <= -2) regime = "risk_off";
  else regime = "neutral";

  const summary = signals.length > 0 ? signals.join(" · ") : "mixed signals";
  return { regime, summary };
}

export async function fetchMacroData(): Promise<MacroDataFull> {
  console.log("[elrond] Fetching FRED macro data...");

  const [
    fundsRate,
    balanceSheet,
    y2,
    y10,
    y30,
    real10y,
    cpiYoY,
    coreCpiYoY,
    unrate,
    nfp,
    dxy,
    nfci,
  ] = await Promise.all([
    fetchFredSeries("DFEDTARU"),      // Fed funds target upper
    fetchFredSeries("WALCL"),         // Fed balance sheet
    fetchFredSeries("DGS2"),          // 2Y Treasury
    fetchFredSeries("DGS10"),         // 10Y Treasury
    fetchFredSeries("DGS30"),         // 30Y Treasury
    fetchFredSeries("DFII10"),        // 10Y TIPS (real)
    fetchFredYoY("CPIAUCSL"),         // CPI YoY
    fetchFredYoY("CPILFESL"),         // Core CPI YoY
    fetchFredSeries("UNRATE"),        // Unemployment rate
    fetchFredMoMChange("PAYEMS"),     // NFP monthly change
    fetchFredSeries("DTWEXBGS"),      // Trade-weighted dollar
    fetchFredSeries("NFCI"),          // Chicago Fed NFCI
  ]);

  // Compute 2s10s spread in basis points
  let curve2s10s: number | null = null;
  let inverted = false;
  if (y2.value !== null && y10.value !== null) {
    curve2s10s = Math.round((y10.value - y2.value) * 100);
    inverted = curve2s10s < 0;
  }

  const trend = classifyInflationTrend(cpiYoY);
  const fcRegime = classifyNfciRegime(nfci);
  const { regime, summary } = classifyRegime({ nfci, curve2s10s, cpi: cpiYoY, unrate });

  const data: MacroDataFull = {
    updated_at: new Date().toISOString(),
    fed: {
      funds_rate: fundsRate,
      balance_sheet_usd_bn: balanceSheet.value
        ? { ...balanceSheet, value: balanceSheet.value / 1000 } // FRED WALCL is in millions → convert to billions
        : balanceSheet,
    },
    yields: {
      y2,
      y10,
      y30,
      real_10y: real10y,
      curve_2s10s_bps: curve2s10s,
      inverted,
    },
    inflation: {
      cpi_yoy_pct: cpiYoY,
      core_cpi_yoy_pct: coreCpiYoY,
      trend,
    },
    employment: {
      unrate,
      nfp_thousands: nfp,
    },
    dollar: {
      dxy_proxy: dxy,
    },
    financial_conditions: {
      nfci,
      regime: fcRegime,
    },
    regime,
    regime_summary: summary,
    health: {
      fred: FRED_API_KEY ? (fundsRate.error ? "error" : "ok") : "no_key",
    },
  };

  const liveCount = [
    fundsRate.value,
    y2.value,
    y10.value,
    cpiYoY.value,
    unrate.value,
    nfci.value,
  ].filter((x) => x !== null).length;

  console.log(
    `[elrond] ${liveCount}/6 core series live · regime: ${regime} · ${summary}`,
  );

  return data;
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchMacroData()
    .then((data) => {
      writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
      console.log(`[elrond] Wrote ${OUT_PATH}`);
    })
    .catch((err) => {
      console.error("[elrond] Failed:", err);
      process.exit(1);
    });
}
