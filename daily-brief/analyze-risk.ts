/**
 * Balin — Risk Sentinel (analyzer)
 * Reads portfolio + wallet data, produces structured risk alerts.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchWallet, type WalletData } from "./fetch-wallet.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_PATH = resolve(__dirname, "../portal/data/portfolio.json");
const RISK_ALERTS_PATH = resolve(__dirname, "../portal/data/risk-alerts.json");

// Risk rule thresholds
const STOP_LOSS_DISTANCE_WARNING = 15; // within 15% = info, within 10% = warning, within 5% = critical
const STOP_LOSS_DISTANCE_CRITICAL = 5;
const CONCENTRATION_LIMIT_PCT = 30;
const CONCENTRATION_WARNING_PCT = 25;
const UNUSUAL_FLOW_USD = 1000;
const STALE_DATA_HOURS = 24;

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertType =
  | "stop_loss"
  | "concentration"
  | "unusual_flow"
  | "liquidation_risk"
  | "stale_data"
  | "chain_concentration";

export interface RiskAlert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  position?: string;
  title: string;
  message: string;
  metric?: {
    current: number;
    threshold: number;
    distance_pct?: number;
  };
  created: string;
}

export interface RiskAlertsData {
  updated_at: string;
  wallet: WalletData | null;
  alerts: RiskAlert[];
  concentration: {
    max_position_pct: number;
    max_position: string;
    limit: number;
    breach: boolean;
  };
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}

interface Perp {
  pair: string;
  leverage: number;
  capital_usd: number;
  entry_1: number;
  entry_2: number;
  stop: number;
}

interface Position {
  name: string;
  ticker: string;
  allocation_usd: number;
  allocation_pct: number;
  bucket: string;
  notes?: string;
}

interface Portfolio {
  nav: number;
  updated_at: string;
  positions: Position[];
  perps: Perp[];
  total_perp_exposure: number;
  avg_leverage: number;
  max_perp_loss: number;
}

/**
 * Fetch current prices for perp pairs from CoinGecko.
 * Maps pair names to CoinGecko IDs.
 */
async function fetchCurrentPrices(perps: Perp[]): Promise<Record<string, number>> {
  const tickerToId: Record<string, string> = {
    "HYPE-PERP": "hyperliquid",
    "ETH-PERP": "ethereum",
    "SOL-PERP": "solana",
    "AAVE-PERP": "aave",
    "BTC-PERP": "bitcoin",
    "UNI-PERP": "uniswap",
  };

  const ids = Array.from(new Set(perps.map((p) => tickerToId[p.pair]).filter(Boolean)));
  if (ids.length === 0) return {};

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
    );
    if (!res.ok) return {};
    const json = await res.json();

    const prices: Record<string, number> = {};
    for (const perp of perps) {
      const id = tickerToId[perp.pair];
      if (id && json[id]?.usd) {
        prices[perp.pair] = json[id].usd;
      }
    }
    return prices;
  } catch (err) {
    console.warn("[balin] CoinGecko price fetch failed:", err);
    return {};
  }
}

export async function analyzeRisk(): Promise<RiskAlertsData> {
  console.log("[balin] Analyzing risk...");

  const portfolio: Portfolio = JSON.parse(readFileSync(PORTFOLIO_PATH, "utf-8"));
  const alerts: RiskAlert[] = [];

  // Fetch wallet data (non-blocking — might fail without API key)
  const wallet = await fetchWallet().catch(() => null);

  // Fetch current prices for perps
  const prices = await fetchCurrentPrices(portfolio.perps);

  // Rule 1: Stop-loss proximity
  for (const perp of portfolio.perps) {
    const current = prices[perp.pair];
    if (!current || !perp.stop) continue;

    // Assume LONG positions (portfolio is long-biased per pitch deck)
    const distancePct = ((current - perp.stop) / current) * 100;

    if (distancePct <= 0) {
      alerts.push({
        id: `stop-${perp.pair}`,
        severity: "critical",
        type: "stop_loss",
        position: perp.pair,
        title: `${perp.pair} stop loss HIT`,
        message: `Current price $${current.toFixed(2)} is at or below stop loss of $${perp.stop.toFixed(2)}. Position should be closed.`,
        metric: {
          current,
          threshold: perp.stop,
          distance_pct: distancePct,
        },
        created: new Date().toISOString(),
      });
    } else if (distancePct <= STOP_LOSS_DISTANCE_CRITICAL) {
      alerts.push({
        id: `stop-${perp.pair}`,
        severity: "critical",
        type: "stop_loss",
        position: perp.pair,
        title: `${perp.pair} very close to stop loss`,
        message: `Current price $${current.toFixed(2)} is ${distancePct.toFixed(1)}% from stop loss ($${perp.stop.toFixed(2)}). Monitor closely.`,
        metric: {
          current,
          threshold: perp.stop,
          distance_pct: distancePct,
        },
        created: new Date().toISOString(),
      });
    } else if (distancePct <= STOP_LOSS_DISTANCE_WARNING) {
      alerts.push({
        id: `stop-${perp.pair}`,
        severity: "warning",
        type: "stop_loss",
        position: perp.pair,
        title: `${perp.pair} approaching stop loss`,
        message: `Current price $${current.toFixed(2)} is ${distancePct.toFixed(1)}% above stop loss ($${perp.stop.toFixed(2)}).`,
        metric: {
          current,
          threshold: perp.stop,
          distance_pct: distancePct,
        },
        created: new Date().toISOString(),
      });
    }
  }

  // Rule 2: Position concentration
  let maxPositionPct = 0;
  let maxPositionName = "";
  for (const pos of portfolio.positions) {
    if (pos.allocation_pct > maxPositionPct) {
      maxPositionPct = pos.allocation_pct;
      maxPositionName = pos.ticker;
    }
  }

  const concentration = {
    max_position_pct: maxPositionPct,
    max_position: maxPositionName,
    limit: CONCENTRATION_LIMIT_PCT,
    breach: maxPositionPct > CONCENTRATION_LIMIT_PCT,
  };

  if (maxPositionPct > CONCENTRATION_LIMIT_PCT) {
    alerts.push({
      id: "concentration-max",
      severity: "warning",
      type: "concentration",
      position: maxPositionName,
      title: `${maxPositionName} position exceeds concentration limit`,
      message: `${maxPositionName} is ${maxPositionPct.toFixed(1)}% of NAV, above the ${CONCENTRATION_LIMIT_PCT}% limit. Consider trimming.`,
      metric: {
        current: maxPositionPct,
        threshold: CONCENTRATION_LIMIT_PCT,
      },
      created: new Date().toISOString(),
    });
  } else if (maxPositionPct > CONCENTRATION_WARNING_PCT) {
    alerts.push({
      id: "concentration-max",
      severity: "info",
      type: "concentration",
      position: maxPositionName,
      title: `${maxPositionName} approaching concentration limit`,
      message: `${maxPositionName} is ${maxPositionPct.toFixed(1)}% of NAV (limit: ${CONCENTRATION_LIMIT_PCT}%).`,
      metric: {
        current: maxPositionPct,
        threshold: CONCENTRATION_LIMIT_PCT,
      },
      created: new Date().toISOString(),
    });
  }

  // Rule 3: Stale portfolio data
  try {
    const updated = new Date(portfolio.updated_at);
    const hoursOld = (Date.now() - updated.getTime()) / (1000 * 60 * 60);
    if (hoursOld > STALE_DATA_HOURS) {
      alerts.push({
        id: "stale-portfolio",
        severity: "info",
        type: "stale_data",
        title: "Portfolio data is stale",
        message: `Last updated ${hoursOld.toFixed(0)}h ago. Run Durin to refresh prices.`,
        created: new Date().toISOString(),
      });
    }
  } catch {}

  // Rule 4: Unusual wallet flows
  if (wallet && wallet.flow_24h.outflows_usd > UNUSUAL_FLOW_USD) {
    alerts.push({
      id: "unusual-outflow",
      severity: "info",
      type: "unusual_flow",
      title: `Large wallet outflow detected`,
      message: `$${wallet.flow_24h.outflows_usd.toFixed(0)} outflow in the last 24 hours.`,
      created: new Date().toISOString(),
    });
  }

  // Sort: critical first, then warning, then info
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const data: RiskAlertsData = {
    updated_at: new Date().toISOString(),
    wallet,
    alerts,
    concentration,
    summary: {
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
      total: alerts.length,
    },
  };

  console.log(
    `[balin] ${data.summary.total} alerts: ${data.summary.critical} critical, ${data.summary.warning} warning, ${data.summary.info} info`,
  );

  return data;
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeRisk()
    .then((data) => {
      writeFileSync(RISK_ALERTS_PATH, JSON.stringify(data, null, 2));
      console.log(`[balin] Wrote ${RISK_ALERTS_PATH}`);
    })
    .catch((err) => {
      console.error("[balin] Failed:", err);
      process.exit(1);
    });
}
