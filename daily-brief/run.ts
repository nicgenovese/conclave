import { fetchPortfolio } from "./fetch-portfolio.js";
import { fetchMacro } from "./fetch-macro.js";
import { analyzeAndBrief } from "./analyze.js";

async function main() {
  const now = new Date();
  console.log("=== Conclave Daily Brief ===");
  console.log(`Date: ${now.toISOString().split("T")[0]}`);
  console.log(`Time: ${now.toTimeString().split(" ")[0]}`);
  console.log("");

  // 1. Portfolio update
  console.log("[1/3] Fetching portfolio prices...");
  let nav = 0;
  let positionCount = 0;
  try {
    const result = await fetchPortfolio();
    nav = result.nav;
    positionCount = result.positionCount;
    console.log(`  -> NAV: $${nav.toLocaleString()}, ${positionCount} positions`);
  } catch (err) {
    console.error("  Portfolio fetch failed:", (err as Error).message);
  }

  console.log("");

  // 2. Macro / Polymarket update
  console.log("[2/3] Fetching macro data...");
  let eventCount = 0;
  try {
    const result = await fetchMacro();
    eventCount = result.eventCount;
    console.log(`  -> ${eventCount} Polymarket events`);
  } catch (err) {
    console.error("  Macro fetch failed:", (err as Error).message);
  }

  console.log("");

  // 3. Analyze + generate brief
  console.log("[3/3] Analyzing data and generating brief...");
  try {
    const result = await analyzeAndBrief();
    console.log(`  -> Brief: ${result.briefPath}`);
    console.log(`  -> Alerts: ${result.alertCount}`);
  } catch (err) {
    console.error("  Analysis failed:", (err as Error).message);
  }

  console.log("");
  console.log("=== Complete ===");
}

main().catch(console.error);
