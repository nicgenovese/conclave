/**
 * Storylines — "Today's Big Picture" hero card content
 *
 * Sonnet reads all agent outputs (ori, gimli, thorin, aragorn, elrond, macro)
 * and identifies 4 active storylines — the major narratives moving right now.
 *
 * For each storyline, it also MATCHES the storyline to a relevant Polymarket
 * prediction market (if one exists in the current macro.json) and includes
 * the market's probability + volume as the "what does the market think"
 * signal.
 *
 * Refresh cadence: every 12 hours (cheaper than per-page-load, still fresh).
 *
 * Output: portal/data/storylines.json
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sonnet, hasAnthropicKey } from "./lib/llm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../portal/data");
const OUT_PATH = resolve(DATA_DIR, "storylines.json");

const REFRESH_INTERVAL_HOURS = 12;

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

export type StorylineCategory =
  | "Geopolitics"
  | "Regulatory"
  | "DeFi"
  | "Commodity"
  | "Macro"
  | "Crypto"
  | "Other";

export interface StorylineSource {
  title: string;
  source: string;
  url: string;
  published?: string;
}

export interface MatchedPolymarket {
  question: string;
  yes_probability: number | null; // 0-1
  no_probability: number | null;
  volume_24h_usd: number | null;
  end_date: string | null;
  url: string;
}

export interface Storyline {
  rank: 1 | 2 | 3 | 4;
  title: string;
  category: StorylineCategory;
  importance: number; // 1-10
  summary: string; // 2 sentences
  sources: StorylineSource[];
  polymarket: MatchedPolymarket | null;
  confidence: "FACT" | "INFERENCE" | "GUESS" | "STUB";
}

export interface StorylinesData {
  updated_at: string;
  next_refresh_at: string;
  model: string;
  storylines: Storyline[];
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
}

// ─────────────────────────────────────────────
// Helper: read JSON
// ─────────────────────────────────────────────
function readJson<T>(filename: string): T | null {
  try {
    const p = resolve(DATA_DIR, filename);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as T;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Check if a refresh is needed (every 12h)
// ─────────────────────────────────────────────
function needsRefresh(): { need: boolean; reason: string } {
  if (!existsSync(OUT_PATH)) return { need: true, reason: "file does not exist" };

  try {
    const existing = JSON.parse(readFileSync(OUT_PATH, "utf-8")) as StorylinesData;
    const updatedAt = new Date(existing.updated_at);
    const now = Date.now();
    const ageHours = (now - updatedAt.getTime()) / (1000 * 60 * 60);

    if (ageHours >= REFRESH_INTERVAL_HOURS) {
      return { need: true, reason: `last refresh was ${ageHours.toFixed(1)}h ago` };
    }
    return { need: false, reason: `last refresh was ${ageHours.toFixed(1)}h ago (fresh)` };
  } catch (err) {
    return { need: true, reason: `could not read existing file: ${err instanceof Error ? err.message : "unknown"}` };
  }
}

// ─────────────────────────────────────────────
// Build compact payload for Sonnet
// ─────────────────────────────────────────────
function buildPayload() {
  const aragorn = readJson<any>("intelligence.json");
  const elrond = readJson<any>("macro-data.json");
  const gimli = readJson<any>("gimli.json");
  const thorin = readJson<any>("governance.json");
  const macro = readJson<any>("macro.json"); // Polymarket events
  const ori = readJson<any>("ori.json");

  // Top Aragorn stories (sonnet-scored already)
  const topStories = (aragorn?.top_stories || [])
    .slice(0, 20)
    .map((s: any) => ({
      title: s.title,
      source: s.source,
      category: s.category,
      thesis_score: s.thesis_score,
      thesis_reason: s.thesis_reason,
      snippet: s.snippet?.slice(0, 150),
      url: s.link,
      published: s.published,
    }));

  // Polymarket events (for storyline matching)
  const polymarketEvents = (macro?.polymarket || []).slice(0, 50).map((e: any) => ({
    id: e.id,
    question: e.question,
    outcomes: e.outcomes?.map((o: any) => ({
      name: o.name,
      probability: o.probability,
    })),
    volume_usd: e.volume_usd,
    end_date: e.end_date,
    category: e.category,
    url: e.url,
  }));

  // Macro state
  const macroSnapshot = elrond
    ? {
        regime: elrond.regime,
        regime_summary: elrond.regime_summary,
        fed_funds: elrond.fed?.funds_rate?.value,
        y10: elrond.yields?.y10?.value,
        cpi_yoy: elrond.inflation?.cpi_yoy_pct?.value,
        ai_parallel: elrond.ai_parallel,
      }
    : null;

  // DeFi valuation state
  const defiSnapshot = gimli
    ? {
        summary: gimli.summary,
        cheapest_top3: (gimli.cheapest || [])
          .slice(0, 3)
          .map((p: any) => ({ ticker: p.ticker, pe_ratio: p.pe_ratio, upside_pct: p.upside_to_peer_pct })),
        narrative: gimli.narrative?.text,
      }
    : null;

  // Governance
  const govSnapshot = thorin
    ? {
        active_count: thorin.active?.length,
        high_impact: (thorin.active || [])
          .filter((a: any) => (a.ai_impact_score ?? 0) >= 7)
          .map((a: any) => ({
            protocol: a.protocol,
            title: a.title,
            ai_summary: a.ai_summary,
            ai_impact_score: a.ai_impact_score,
            voting_ends: a.voting_ends,
          })),
      }
    : null;

  // Commodities for geopolitics/commodity storylines
  const commodities = ori?.commodities
    ? {
        gold_usd_oz: ori.commodities.gold_usd_oz?.value,
        silver_usd_oz: ori.commodities.silver_usd_oz?.value,
        copper_usd_lb: ori.commodities.copper_usd_lb?.value,
        wti_usd_bbl: ori.commodities.wti_usd_bbl?.value,
        brent_usd_bbl: ori.commodities.brent_usd_bbl?.value,
      }
    : null;

  return {
    top_stories: topStories,
    polymarket_events: polymarketEvents,
    macro: macroSnapshot,
    defi_valuation: defiSnapshot,
    governance: govSnapshot,
    commodities,
  };
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export async function fetchStorylines(force = false): Promise<StorylinesData | null> {
  // Check if refresh is needed (every 12h)
  if (!force) {
    const { need, reason } = needsRefresh();
    if (!need) {
      console.log(`[storylines] Skipping refresh — ${reason}`);
      try {
        return JSON.parse(readFileSync(OUT_PATH, "utf-8")) as StorylinesData;
      } catch {
        return null;
      }
    }
    console.log(`[storylines] Refreshing — ${reason}`);
  }

  if (!hasAnthropicKey()) {
    // Stub mode: write a placeholder file so the dashboard has something to render
    const stub: StorylinesData = {
      updated_at: new Date().toISOString(),
      next_refresh_at: new Date(Date.now() + REFRESH_INTERVAL_HOURS * 3600_000).toISOString(),
      model: "stub",
      storylines: [
        {
          rank: 1,
          title: "Storylines require ANTHROPIC_API_KEY",
          category: "Other",
          importance: 1,
          summary: "Add ANTHROPIC_API_KEY to secrets/.env to enable AI-generated storylines.",
          sources: [],
          polymarket: null,
          confidence: "STUB",
        },
      ],
      cost_usd: 0,
      input_tokens: 0,
      output_tokens: 0,
    };
    return stub;
  }

  const payload = buildPayload();

  if ((payload.top_stories as any[]).length === 0) {
    console.log("[storylines] No news items available, skipping generation");
    return null;
  }

  console.log(
    `[storylines] Generating from ${(payload.top_stories as any[]).length} stories, ${(payload.polymarket_events as any[]).length} Polymarket events...`,
  );

  const response = await sonnet(
    "Storylines — today's big picture",
    payload,
    `You are writing the "Today's Big Picture" hero card for Moria Capital's morning dashboard. Your job is to identify exactly 4 major storylines that are shaping markets right now, based on the news items, macro state, governance activity, and commodity moves I've given you.

Rules:

1. Pick 4 storylines ONLY. They should be distinct narratives, not 4 variations of the same story.

2. For each storyline, pick a CATEGORY from: Geopolitics, Regulatory, DeFi, Commodity, Macro, Crypto, Other.

3. Write a TITLE (5-10 words, punchy, no clickbait) and a SUMMARY (exactly 2 sentences, ~40 words total, factual, no hedging).

4. Give each storyline an IMPORTANCE score 1-10 based on how broadly it affects markets right now.

5. For each storyline, find 2-4 SOURCES from the top_stories list. Each source must be an item from the input (same title, source, URL). Do not invent sources.

6. For each storyline, look at the polymarket_events list and find the ONE market that MOST CLOSELY touches the same topic — it doesn't need to be a perfect match, just the best available proxy. For example:
   - Regulatory storyline → find any SEC/crypto regulation/ETF/bill market
   - DeFi/Hyperliquid storyline → find any crypto price market or ETF approval market
   - Commodity storyline → find any gold/oil/copper/Trump trade market
   - Geopolitics storyline → find any election/war/sanction market
   - Macro storyline → find any Fed/rate cut/recession/inflation market
   Return the selected market's question + outcomes + volume_usd + end_date + url from the input verbatim. Only return null if there is truly NO related market at all.

7. Do not write "Moria implications" or portfolio advice. Just the story + the market's view via Polymarket odds.

Respond with ONE JSON object only (no markdown fence):
{
  "storylines": [
    {
      "rank": 1,
      "title": "...",
      "category": "Regulatory",
      "importance": 9,
      "summary": "Two factual sentences.",
      "sources": [
        { "title": "exact from top_stories", "source": "exact", "url": "exact", "published": "..." }
      ],
      "polymarket": {
        "question": "exact from polymarket_events or null",
        "yes_probability": 0.62,
        "no_probability": 0.38,
        "volume_24h_usd": 1250000,
        "end_date": "...",
        "url": "..."
      } or null
    },
    ... 3 more ...
  ]
}

Every number you cite must come from the payload. Every source/polymarket entry must be copied verbatim from the input arrays.`,
    4000,
  );

  if (response.confidence === "STUB") {
    console.log("[storylines] LLM stub mode");
    return null;
  }

  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.storylines) || parsed.storylines.length === 0) {
      throw new Error("no storylines array");
    }

    const storylines: Storyline[] = parsed.storylines.slice(0, 4).map((s: any, i: number) => ({
      rank: (i + 1) as 1 | 2 | 3 | 4,
      title: typeof s.title === "string" ? s.title : "Untitled",
      category: s.category || "Other",
      importance: typeof s.importance === "number" ? s.importance : 5,
      summary: typeof s.summary === "string" ? s.summary : "",
      sources: Array.isArray(s.sources) ? s.sources.slice(0, 4) : [],
      polymarket: s.polymarket && typeof s.polymarket === "object" ? s.polymarket : null,
      confidence: response.confidence,
    }));

    return {
      updated_at: new Date().toISOString(),
      next_refresh_at: new Date(Date.now() + REFRESH_INTERVAL_HOURS * 3600_000).toISOString(),
      model: response.model,
      storylines,
      cost_usd: response.costUsd || 0,
      input_tokens: response.inputTokens || 0,
      output_tokens: response.outputTokens || 0,
    };
  } catch (err) {
    console.error(
      "[storylines] Failed to parse Sonnet response:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes("--force");
  fetchStorylines(force)
    .then((data) => {
      if (data) {
        writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
        console.log(`[storylines] Wrote ${OUT_PATH}`);
        console.log(`[storylines] ${data.storylines.length} storylines · cost $${data.cost_usd.toFixed(4)}`);
        for (const s of data.storylines) {
          console.log(`  [${s.rank}] (${s.category}) ${s.title}`);
          if (s.polymarket) {
            console.log(`      Polymarket: ${s.polymarket.yes_probability !== null ? (s.polymarket.yes_probability * 100).toFixed(0) + "%" : "-"} yes · $${((s.polymarket.volume_24h_usd ?? 0) / 1000).toFixed(0)}K vol`);
          }
        }
      } else {
        console.log("[storylines] No storylines generated");
      }
    })
    .catch((err) => {
      console.error("[storylines] Failed:", err);
      process.exit(1);
    });
}
