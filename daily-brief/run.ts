/**
 * Conclave Daily Brief — orchestrates all 7 agent fetchers in parallel,
 * then writes the unified markdown brief.
 *
 * Agents:
 *  1. Durin (fetch-portfolio + fetch-macro polymarket + analyze brief)
 *  2. Thorin (fetch-governance)
 *  3. Balin (analyze-risk, which calls fetch-wallet)
 *  4. Gimli (fetch-commodities)
 *  5. Elrond (fetch-macro-data)
 *  6. Aragorn (fetch-intelligence)
 *
 * Gracefully handles individual agent failures.
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchPortfolio } from "./fetch-portfolio.js";
import { fetchMacro } from "./fetch-macro.js";
import { fetchGovernance } from "./fetch-governance.js";
import { fetchCommodities } from "./fetch-commodities.js";
import { fetchMacroData } from "./fetch-macro-data.js";
import { fetchIntelligence } from "./fetch-intelligence.js";
import { analyzeRisk } from "./analyze-risk.js";
import { analyzeAndBrief } from "./analyze.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../portal/data");

// Helper to safely write a JSON file
function writeJson(filename: string, data: unknown) {
  try {
    writeFileSync(resolve(DATA_DIR, filename), JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`  ✗ Failed to write ${filename}:`, (err as Error).message);
    return false;
  }
}

// Helper to run an agent with graceful failure handling
async function runAgent<T>(
  name: string,
  icon: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    console.log(`  ${icon} ${name} ✓ (${ms}ms)`);
    return result;
  } catch (err) {
    console.error(`  ${icon} ${name} ✗ ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  const now = new Date();
  console.log("╔════════════════════════════════════╗");
  console.log("║    Conclave Daily Brief            ║");
  console.log(`║    ${now.toISOString().slice(0, 19).replace("T", " ")}              ║`);
  console.log("╚════════════════════════════════════╝");
  console.log("");

  // ─────────────────────────────────────────────
  // Phase A: Parallel data fetches (all independent)
  // ─────────────────────────────────────────────
  console.log("Phase A — Fetching (parallel):");

  const [
    portfolioResult,
    macroResult,
    governanceResult,
    commoditiesResult,
    macroDataResult,
    intelligenceResult,
  ] = await Promise.all([
    runAgent("Durin    (portfolio)    ", "📊", () => fetchPortfolio()),
    runAgent("Durin    (polymarket)   ", "🎯", () => fetchMacro()),
    runAgent("Thorin   (governance)   ", "🏛️ ", () => fetchGovernance()),
    runAgent("Gimli    (commodities)  ", "🔨", () => fetchCommodities()),
    runAgent("Elrond   (macro FRED)   ", "🧙", () => fetchMacroData()),
    runAgent("Aragorn  (intelligence) ", "🏹", () => fetchIntelligence()),
  ]);

  // Write outputs that don't auto-write
  if (governanceResult) writeJson("governance.json", governanceResult);
  if (commoditiesResult) writeJson("commodities.json", commoditiesResult);
  if (macroDataResult) writeJson("macro-data.json", macroDataResult);
  if (intelligenceResult) writeJson("intelligence.json", intelligenceResult);

  console.log("");

  // ─────────────────────────────────────────────
  // Phase B: Risk analysis (depends on portfolio)
  // ─────────────────────────────────────────────
  console.log("Phase B — Analysis (sequential):");

  const riskResult = await runAgent("Balin    (risk alerts)  ", "🛡️ ", () =>
    analyzeRisk(),
  );
  if (riskResult) writeJson("risk-alerts.json", riskResult);

  console.log("");

  // ─────────────────────────────────────────────
  // Phase C: Unified brief (aggregates everything)
  // ─────────────────────────────────────────────
  console.log("Phase C — Brief generation:");
  const briefResult = await runAgent("Durin    (write brief)  ", "📝", () =>
    analyzeAndBrief(),
  );

  console.log("");

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  const results = {
    portfolio: portfolioResult ? "ok" : "failed",
    polymarket: macroResult ? "ok" : "failed",
    governance: governanceResult
      ? `${governanceResult.active.length} active`
      : "failed",
    commodities: commoditiesResult
      ? `${commoditiesResult.signals.length} signals`
      : "failed",
    macro: macroDataResult
      ? `regime: ${macroDataResult.regime}`
      : "failed",
    intelligence: intelligenceResult
      ? `${intelligenceResult.summary.total_items} items`
      : "failed",
    risk: riskResult
      ? `${riskResult.summary.critical} critical, ${riskResult.summary.warning} warning`
      : "failed",
    brief: briefResult ? "written" : "failed",
  };

  console.log("═══════════════════════════════════════");
  console.log("Summary:");
  Object.entries(results).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(12)} ${v}`);
  });
  console.log("═══════════════════════════════════════");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
