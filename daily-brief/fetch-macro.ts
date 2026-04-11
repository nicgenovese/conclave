import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MACRO_PATH = resolve(__dirname, "../portal/data/macro.json");

interface PolymarketEvent {
  id: string;
  question: string;
  outcomes: { name: string; probability: number }[];
  volume_usd: number;
  end_date: string;
  category: string;
  url: string;
}

interface MacroData {
  updated_at: string;
  polymarket: PolymarketEvent[];
  signals: any[];
}

function categorizeEvent(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("bitcoin") || lower.includes("btc") || lower.includes("eth") || lower.includes("crypto"))
    return "Crypto";
  if (lower.includes("fed") || lower.includes("rate") || lower.includes("inflation") || lower.includes("gdp"))
    return "Rates";
  if (lower.includes("regulation") || lower.includes("sec") || lower.includes("law") || lower.includes("bill"))
    return "Regulation";
  if (lower.includes("defi") || lower.includes("tvl") || lower.includes("protocol")) return "DeFi";
  if (lower.includes("oil") || lower.includes("gold") || lower.includes("commodity")) return "Macro";
  if (lower.includes("election") || lower.includes("president") || lower.includes("vote")) return "Politics";
  return "General";
}

async function fetchPolymarketEvents(): Promise<PolymarketEvent[]> {
  const url =
    "https://gamma-api.polymarket.com/events?closed=false&order=volume24hr&ascending=false&limit=50";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Polymarket Gamma ${res.status}: ${res.statusText}`);
    const events: any[] = await res.json();

    return events.map((evt) => {
      // Parse outcomes from the event's markets
      const markets = evt.markets || [];
      const outcomes: { name: string; probability: number }[] = [];

      if (markets.length > 0) {
        const market = markets[0];
        // Gamma API returns outcomes as arrays
        const outcomeNames: string[] = market.outcomes ? JSON.parse(market.outcomes) : ["Yes", "No"];
        const outcomePrices: string[] = market.outcomePrices
          ? JSON.parse(market.outcomePrices)
          : [];

        outcomeNames.forEach((name: string, i: number) => {
          outcomes.push({
            name,
            probability: outcomePrices[i] ? parseFloat(outcomePrices[i]) : 0,
          });
        });
      }

      // Calculate total volume across all markets
      const totalVolume = markets.reduce(
        (sum: number, m: any) => sum + (parseFloat(m.volume24hr) || 0),
        0
      );

      return {
        id: String(evt.id || evt.slug || ""),
        question: evt.title || "Unknown",
        outcomes,
        volume_usd: Math.round(totalVolume),
        end_date: evt.endDate || markets[0]?.endDate || "",
        category: categorizeEvent(evt.title || ""),
        url: evt.slug ? `https://polymarket.com/event/${evt.slug}` : "https://polymarket.com",
      };
    });
  } catch (err) {
    console.error("[fetch-macro] Polymarket error:", (err as Error).message);
    return [];
  }
}

export async function fetchMacro(): Promise<{ eventCount: number }> {
  // Read current macro data (preserve signals)
  let macro: MacroData;
  try {
    macro = JSON.parse(readFileSync(MACRO_PATH, "utf-8"));
  } catch {
    macro = { updated_at: "", polymarket: [], signals: [] };
  }

  // Fetch Polymarket events
  const events = await fetchPolymarketEvents();

  if (events.length > 0) {
    macro.polymarket = events;
    console.log(`[fetch-macro] Fetched ${events.length} Polymarket events`);
  } else {
    console.log("[fetch-macro] No new Polymarket data, keeping existing");
  }

  macro.updated_at = new Date().toISOString();

  // Write back
  writeFileSync(MACRO_PATH, JSON.stringify(macro, null, 2) + "\n", "utf-8");
  console.log(`[fetch-macro] Wrote macro.json with ${macro.polymarket.length} events, ${macro.signals.length} signals`);

  return { eventCount: macro.polymarket.length };
}

// Allow direct execution
if (process.argv[1]?.endsWith("fetch-macro.ts")) {
  fetchMacro().catch(console.error);
}
