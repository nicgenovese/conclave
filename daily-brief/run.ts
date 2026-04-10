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
  if (oriResult) writeJson("ori.json", oriResult);
  // Back-compat: keep portfolio.json updated with Ori's legacy_shape so the
  // old dashboard code still works while we migrate.
  if (oriResult) writeJson("portfolio.json", oriResult.legacy_shape);

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
  // TIER 3: Durin synthesis (Wave 2 activates Sonnet writing)
  // For now: the legacy analyze.ts still produces a basic markdown brief
  // ─────────────────────────────────────────
  console.log("Tier 3 — Synthesis:");
  try {
    const { analyzeAndBrief } = await import("./analyze.js");
    const briefResult = await runAgent(
      "Durin   (write brief markdown)  ",
      "📝",
      () => analyzeAndBrief(),
    );
  } catch (err) {
    console.log(`  📝 Durin   (write brief)             ✗  analyze.ts not available`);
  }

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
