#!/usr/bin/env tsx
/**
 * /nav — current portfolio snapshot (deterministic, no LLM)
 *
 * Reads portal/data/ori.json and prints a clean CLI summary of:
 *  - NAV + updated timestamp
 *  - Top positions (ticker, value, allocation %)
 *  - Perp exposure + max loss
 *  - Allocation buckets (Core / DeFi Value / Yield / Emerging / Gas / Perps)
 *  - Any active alerts
 *  - Health dots (DeFi Llama / Hyperliquid / Etherscan)
 *
 * Usage:
 *   cd ~/conclave && npx tsx scripts/nav.ts
 *   cd ~/conclave && npx tsx scripts/nav.ts --json   # machine-readable
 *
 * Output is 100% deterministic — same input JSON, same output, forever.
 * No API calls, no LLM tokens, no network.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORI_PATH = resolve(__dirname, "../portal/data/ori.json");

// ─────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────

function usd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(digits)}%`;
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main() {
  if (!existsSync(ORI_PATH)) {
    console.error(`[nav] ${ORI_PATH} not found. Run the pipeline first:`);
    console.error(`      cd ~/conclave/daily-brief && npx tsx run.ts`);
    process.exit(1);
  }

  let ori: any;
  try {
    ori = JSON.parse(readFileSync(ORI_PATH, "utf-8"));
  } catch (err) {
    console.error(`[nav] Failed to parse ori.json: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  // --json mode: print the raw object and exit
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({
      updated_at: ori.updated_at,
      nav_usd: ori.nav_usd,
      positions_count: ori.positions?.length ?? 0,
      perps_count: ori.perps?.length ?? 0,
      alerts_count: ori.alerts?.length ?? 0,
      concentration: ori.concentration,
      health: ori.health,
    }, null, 2));
    return;
  }

  const nav = ori.nav_usd as number;
  const positions = (ori.positions || []) as Array<any>;
  const perps = (ori.perps || []) as Array<any>;
  const alerts = (ori.alerts || []) as Array<any>;
  const concentration = ori.concentration || {};
  const health = ori.health || {};
  const buckets = (ori.legacy_shape?.allocation_buckets || []) as Array<any>;
  const perpExposure = (ori.legacy_shape?.total_perp_exposure ?? 0) as number;
  const maxLoss = (ori.legacy_shape?.max_perp_loss ?? 0) as number;
  const avgLeverage = (ori.legacy_shape?.avg_leverage ?? 0) as number;

  // ───── Header ─────
  console.log("");
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║                    MORIA CAPITAL                      ║");
  console.log("║                   Portfolio Snapshot                  ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  As of: ${ori.updated_at?.slice(0, 19).replace("T", " ") ?? "?"} UTC · ${timeAgo(ori.updated_at)}`);
  console.log(`  Wallet: ${ori.wallet_address ?? "?"}`);
  console.log("");

  // ───── Headline metrics ─────
  console.log("  ┌─────────────────────────────────────────────────────┐");
  console.log(`  │  NAV              ${usd(nav).padStart(14)}                      │`);
  console.log(`  │  Positions        ${String(positions.length).padStart(14)}                      │`);
  console.log(`  │  Perp Exposure    ${usd(perpExposure).padStart(14)}  (${avgLeverage.toFixed(1)}x avg)       │`);
  console.log(`  │  Max Perp Loss    ${usd(maxLoss).padStart(14)}                      │`);
  console.log("  └─────────────────────────────────────────────────────┘");
  console.log("");

  // ───── Buckets ─────
  if (buckets.length > 0) {
    console.log("  Allocation by bucket:");
    const maxBar = 30;
    for (const b of buckets) {
      const barLen = Math.round((b.pct / 100) * maxBar);
      const bar = "█".repeat(barLen) + "░".repeat(maxBar - barLen);
      console.log(`    ${b.name.padEnd(12)} ${bar} ${pct(b.pct)}  ${usd(b.total_usd)}`);
    }
    console.log("");
  }

  // ───── Top positions ─────
  if (positions.length > 0) {
    console.log("  Top positions:");
    const sorted = [...positions].sort((a, b) => (b.value_usd ?? 0) - (a.value_usd ?? 0));
    const top = sorted.slice(0, 8);
    const maxTicker = Math.max(...top.map((p) => p.ticker?.length ?? 0));
    for (const p of top) {
      const ticker = (p.ticker ?? "?").padEnd(maxTicker);
      const value = usd(p.value_usd).padStart(10);
      const alloc = pct(p.allocation_pct).padStart(7);
      const bucket = (p.bucket ?? "").padEnd(12);
      const chain = p.chain ?? "";
      console.log(`    ${ticker}  ${value}  ${alloc}   ${bucket}  ${chain}`);
    }
    console.log("");
  }

  // ───── Perps ─────
  if (perps.length > 0) {
    console.log("  Live perp positions:");
    for (const p of perps) {
      const pair = (p.pair ?? "?").padEnd(12);
      const side = (p.side ?? "?").padEnd(5);
      const size = usd(p.size_usd).padStart(10);
      const lev = `${p.leverage ?? "?"}x`;
      const pnlStr = p.unrealized_pnl_usd !== null && p.unrealized_pnl_usd !== undefined
        ? (p.unrealized_pnl_usd >= 0 ? `+${usd(p.unrealized_pnl_usd)}` : `-${usd(Math.abs(p.unrealized_pnl_usd))}`)
        : "—";
      console.log(`    ${pair}  ${side}  ${size}  ${lev.padEnd(4)}  pnl ${pnlStr}`);
    }
    console.log("");
  }

  // ───── Concentration ─────
  if (concentration.max_position_ticker) {
    const breach = concentration.breach ? " ⚠️  BREACH" : "";
    console.log(`  Concentration: ${concentration.max_position_ticker} at ${pct(concentration.max_position_pct)} (limit ${concentration.limit}%)${breach}`);
    console.log("");
  }

  // ───── Alerts ─────
  if (alerts.length > 0) {
    console.log("  Active alerts:");
    for (const a of alerts) {
      const sev = a.severity === "critical" ? "🔴" : a.severity === "warning" ? "🟠" : "⚪";
      console.log(`    ${sev} [${(a.severity ?? "info").toUpperCase().padEnd(8)}] ${a.title ?? ""}`);
      if (a.message) console.log(`       ${a.message}`);
    }
    console.log("");
  } else {
    console.log("  No active alerts.");
    console.log("");
  }

  // ───── Health ─────
  const h = (status: string) => {
    if (status === "ok") return "🟢";
    if (status === "stub") return "🟡";
    if (status === "no_key") return "🟡";
    return "🔴";
  };
  console.log("  Data source health:");
  console.log(`    ${h(health.defillama)} DeFi Llama    ${h(health.hyperliquid)} Hyperliquid    ${h(health.etherscan)} Etherscan V2    ${h(health.yahoo)} Yahoo Finance`);
  console.log("");
}

main();
