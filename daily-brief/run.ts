/**
 * Conclave Daily Brief — 6-Agent Orchestrator
 *
 * Architecture:
 *   Tier 1 (Truth):     Ori    — deterministic, no LLM
 *   Tier 2 (Specialists): Aragorn, Thorin, Gimli, Elrond — LLM-augmented
 *   Tier 3 (Synthesizer): Durin  — reads all agent outputs + writes brief
 *
 * Each agent runs in parallel where possible, fails gracefully on error.
 * All outputs land in portal/data/*.json for the dashboard to consume.
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchOri } from "./fetch-ori.js";
import { fetchGimli } from "./fetch-gimli.js";
import { fetchMacro } from "./fetch-macro.js";
import { fetchGovernance } from "./fetch-governance.js";
import { fetchIntelligence } from "./fetch-intelligence.js";
import { fetchMacroData } from "./fetch-macro-data.js";
import { fetchStorylines } from "./fetch-storylines.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../portal/data");

function writeJson(filename: string, data: unknown): boolean {
  try {
    writeFileSync(resolve(DATA_DIR, filename), JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`  ✗ Failed to write ${filename}:`, (err as Error).message);
    return false;
  }
}

async function runAgent<T>(
  name: string,
  icon: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    console.log(`  ${icon} ${name.padEnd(32)} ✓  ${ms}ms`);
    return result;
  } catch (err) {
    console.error(`  ${icon} ${name.padEnd(32)} ✗  ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  const now = new Date();
  console.log("╔════════════════════════════════════════╗");
  console.log("║       Conclave — Daily Brief           ║");
  console.log(`║       ${now.toISOString().slice(0, 19).replace("T", " ")}               ║`);
  console.log("╚════════════════════════════════════════╝");
  console.log("");

  // ─────────────────────────────────────────
  // TIER 1: Truth (deterministic, must run first)
  // ─────────────────────────────────────────
  console.log("Tier 1 — Truth:");
  const oriResult = await runAgent("Ori     (multichain truth)      ", "🗿", () => fetchOri());
  if (oriResult) {
    writeJson("ori.json", oriResult);
    // Back-compat shims — Ori is the single source of truth but we write the
    // legacy file shapes so the portal pages that still read the old paths
    // continue to work with zero changes.
    writeJson("portfolio.json", oriResult.legacy_shape);

    // Remap Ori's commodity shape into the legacy CommoditiesData shape that
    // portal/commodities/page.tsx and the old dashboard section expect.
    const oc = oriResult.commodities;
    const emptyPoint = { value: null, source: null as null };
    const emptyCurve = { front: null, next: null, curve: "unknown" as const, spread_pct: null };
    const toPoint = (p?: { value: number | null } | null) =>
      p && typeof p.value === "number"
        ? { value: p.value, source: "yahoo" as const }
        : emptyPoint;
    writeJson("commodities.json", {
      updated_at: oriResult.updated_at,
      spot: {
        gold_usd_oz: toPoint(oc.gold_usd_oz),
        silver_usd_oz: toPoint(oc.silver_usd_oz),
        platinum_usd_oz: emptyPoint,
        palladium_usd_oz: emptyPoint,
        copper_usd_lb: toPoint(oc.copper_usd_lb),
        wti_usd_bbl: toPoint(oc.wti_usd_bbl),
        brent_usd_bbl: toPoint(oc.brent_usd_bbl),
      },
      futures: { gold: emptyCurve, copper: emptyCurve, wti: emptyCurve },
      tokenized: {
        paxg_usd: toPoint(oc.paxg_usd),
        xaut_usd: toPoint(oc.xaut_usd),
        paxg_premium_bps: null,
      },
      mining_equities: {
        freeport_fcx: toPoint(oc.mining_equities?.fcx),
        bhp: toPoint(oc.mining_equities?.bhp),
        rio: toPoint(oc.mining_equities?.rio),
        newmont_nem: toPoint(oc.mining_equities?.nem),
      },
      signals: [],
      health: {
        metals_api: "no_key" as const,
        alpha_vantage: "no_key" as const,
        coingecko: "ok" as const,
      },
    });
    writeJson("risk-alerts.json", {
      updated_at: oriResult.updated_at,
      source: "ori",
      alerts: oriResult.alerts,
      concentration: oriResult.concentration,
      summary: {
        critical: oriResult.alerts.filter((a) => a.severity === "critical").length,
        warning: oriResult.alerts.filter((a) => a.severity === "warning").length,
        info: oriResult.alerts.filter((a) => a.severity === "info").length,
        total: oriResult.alerts.length,
      },
    });
  }

  console.log("");

  // ─────────────────────────────────────────
  // TIER 2: Specialists (parallel, independent)
  // ─────────────────────────────────────────
  console.log("Tier 2 — Specialists (parallel):");

  const [
    gimliResult,
    macroPoly,
    thorinResult,
    aragornResult,
    elrondResult,
  ] = await Promise.all([
    runAgent("Gimli   (DeFi P/E analysis)     ", "🔨", () => fetchGimli()),
    runAgent("Durin   (Polymarket events)     ", "🎯", () => fetchMacro()),
    runAgent("Thorin  (governance)            ", "🏛️ ", () => fetchGovernance()),
    runAgent("Aragorn (RSS intelligence)      ", "🏹", () => fetchIntelligence()),
    runAgent("Elrond  (macro FRED)            ", "🧙", () => fetchMacroData()),
  ]);

  if (gimliResult) writeJson("gimli.json", gimliResult);
  if (thorinResult) writeJson("governance.json", thorinResult);
  if (aragornResult) writeJson("intelligence.json", aragornResult);
  if (elrondResult) writeJson("macro-data.json", elrondResult);

  console.log("");

  // ─────────────────────────────────────────
  // TIER 3: Synthesis — brief markdown + storylines
  // ─────────────────────────────────────────
  console.log("Tier 3 — Synthesis:");
  try {
    const { analyzeAndBrief } = await import("./analyze.js");
    await runAgent("Durin    (write brief markdown) ", "📝", () => analyzeAndBrief());
  } catch {
    console.log(`  📝 Durin    (write brief)             ✗  analyze.ts not available`);
  }

  // Storylines — "Today's Big Picture" hero card content, refreshes every 12h
  const storylinesResult = await runAgent(
    "Storylines (12h refresh check)   ",
    "📰",
    () => fetchStorylines(false),
  );
  if (storylinesResult) writeJson("storylines.json", storylinesResult);

  console.log("");

  // ─────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────
  const summary = {
    "Truth":        oriResult    ? `NAV $${oriResult.nav_usd.toFixed(0)} · ${oriResult.positions.length} positions · ${oriResult.perps.length} perps · ${oriResult.alerts.length} alerts` : "✗ failed",
    "DeFi P/E":     gimliResult  ? `${gimliResult.summary.cheap} cheap, ${gimliResult.summary.fair} fair, ${gimliResult.summary.expensive} expensive` : "✗ failed",
    "Polymarket":   macroPoly    ? `✓` : "✗ failed",
    "Governance":   thorinResult ? `${thorinResult.active.length} active proposals` : "✗ failed",
    "Intelligence": aragornResult ? `${aragornResult.summary.total_items} items, ${aragornResult.summary.by_priority.high} high` : "✗ failed",
    "Macro":        elrondResult ? `regime: ${elrondResult.regime}` : "✗ failed",
  };

  console.log("═══════════════════════════════════════════");
  console.log("Summary:");
  for (const [k, v] of Object.entries(summary)) {
    console.log(`  ${k.padEnd(14)} ${v}`);
  }
  console.log("═══════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Fatal error in run.ts:", err);
  process.exit(1);
});
