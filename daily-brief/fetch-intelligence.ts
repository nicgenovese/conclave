/**
 * Aragorn — Intelligence Scribe
 * Fetches RSS feeds from commodity, blockchain, regulatory sources.
 * Scores headlines by relevance to the fund's positions, deduplicates, categorizes.
 *
 * 100% free — RSS only. No API keys needed.
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import Parser from "rss-parser";
import { sonnet, hasAnthropicKey } from "./lib/llm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../portal/data/intelligence.json");

type Category = "commodity" | "defi" | "regulatory" | "company" | "exploits";
type Priority = "high" | "medium" | "low";

interface Source {
  name: string;
  url: string;
  category: Category;
  weight: number; // 1-10, how much to trust
}

const SOURCES: Source[] = [
  // Commodity
  { name: "Mining.com",        url: "https://www.mining.com/feed/",           category: "commodity",  weight: 8 },
  { name: "Northern Miner",    url: "https://www.northernminer.com/feed/",    category: "commodity",  weight: 7 },

  // DeFi/Crypto
  { name: "The Block",     url: "https://www.theblock.co/rss.xml",           category: "defi",       weight: 9 },
  { name: "CoinDesk",      url: "https://www.coindesk.com/arc/outboundfeeds/rss/", category: "defi",  weight: 8 },
  { name: "Protos",        url: "https://protos.com/feed/",                  category: "defi",       weight: 7 },
  { name: "Decrypt",       url: "https://decrypt.co/feed",                    category: "defi",       weight: 7 },

  // Exploits
  { name: "Rekt News",     url: "https://rekt.news/rss/feed.xml",             category: "exploits",   weight: 10 },

  // Regulatory
  { name: "SEC Press",     url: "https://www.sec.gov/news/pressreleases.rss", category: "regulatory", weight: 9 },
  { name: "CFTC News",     url: "https://www.cftc.gov/PressRoom/PressReleases/rss.xml", category: "regulatory", weight: 8 },

  // Company news (Google News RSS — free)
  { name: "Glencore News",  url: "https://news.google.com/rss/search?q=Glencore&hl=en-US&gl=US&ceid=US:en",   category: "company", weight: 7 },
  { name: "Trafigura News", url: "https://news.google.com/rss/search?q=Trafigura&hl=en-US&gl=US&ceid=US:en",  category: "company", weight: 7 },
  { name: "Coinbase News",  url: "https://news.google.com/rss/search?q=Coinbase&hl=en-US&gl=US&ceid=US:en",   category: "company", weight: 7 },
  { name: "Circle News",    url: "https://news.google.com/rss/search?q=%22Circle+USDC%22&hl=en-US&gl=US&ceid=US:en", category: "company", weight: 7 },
];

// Keywords that score high if present in title
const HIGH_VALUE_KEYWORDS = [
  // Our positions
  "aave", "uniswap", "pendle", "hyperliquid", "morpho", "lido", "cow protocol", "ens",
  "ethereum", "solana", "wsteth", "paxg",
  // Fund-relevant
  "stablecoin", "tokenized", "rwa", "real-world asset", "real world asset",
  "fee switch", "buyback", "governance",
  // Macro triggers
  "fed", "sec", "regulatory", "etf", "approved", "rejected", "lawsuit",
  // Commodities
  "copper", "gold", "silver", "lme", "glencore", "trafigura", "vitol",
  // Exploits/risks
  "hack", "exploit", "rug", "drained", "vulnerability", "paused",
];

const MEDIUM_VALUE_KEYWORDS = [
  "defi", "crypto", "blockchain", "web3", "dao", "airdrop", "staking",
  "commodity", "mining", "trading", "perpetual", "yield",
];

interface IntelligenceItem {
  id: string;
  source: string;
  source_weight: number;
  title: string;
  link: string;
  category: Category;
  priority: Priority;
  priority_score: number;
  matched_keywords: string[];
  published: string;
  snippet?: string;
  /**
   * Sonnet's thesis-relevance score (1-10), only set when ANTHROPIC_API_KEY
   * is present. 1-3 = noise, 4-6 = tangential, 7-8 = relevant, 9-10 = critical.
   */
  thesis_score?: number;
  thesis_reason?: string;
}

export interface IntelligenceData {
  updated_at: string;
  categories: Record<Category, IntelligenceItem[]>;
  top_stories: IntelligenceItem[];
  summary: {
    total_items: number;
    by_category: Record<Category, number>;
    by_priority: Record<Priority, number>;
    sources_succeeded: number;
    sources_failed: number;
    failed_sources: string[];
    sonnet_rescored: number;
    sonnet_confidence: "FACT" | "INFERENCE" | "GUESS" | "STUB" | "skipped";
  };
}

// ─────────────────────────────────────────────────
// Sonnet thesis-relevance rescorer
// ─────────────────────────────────────────────────
// Takes the top 30 candidates from keyword scoring and asks Sonnet to rank
// each 1-10 on Moria thesis relevance. This replaces shallow keyword matching
// with real semantic understanding while keeping the grounded-generation guarantee.
async function rescoreWithSonnet(
  candidates: IntelligenceItem[],
): Promise<{ rescored: IntelligenceItem[]; confidence: "FACT" | "INFERENCE" | "GUESS" | "STUB" | "skipped" }> {
  if (!hasAnthropicKey()) {
    return { rescored: candidates, confidence: "skipped" };
  }

  // Cap to top 30 candidates by keyword score so the Sonnet call stays cheap
  const toScore = candidates.slice(0, 30);

  // Build a compact JSON payload with just the fields Sonnet needs
  const payload = {
    thesis: "Moria Capital invests in undervalued DeFi infrastructure (2-9x earnings vs TradFi 15-25x) and tracks commodity trade finance migration to on-chain rails. Positions include AAVE, HYPE (Hyperliquid), PENDLE, MORPHO, UNI, wstETH, COW, ETH. Watchlist includes Bittensor, Virtuals, Zcash, Jupiter, Ondo, Centrifuge, and AI/privacy/RWA protocols.",
    items: toScore.map((item, idx) => ({
      idx,
      source: item.source,
      title: item.title,
      snippet: item.snippet?.slice(0, 200) || "",
    })),
  };

  const response = await sonnet(
    "Aragorn — thesis-relevance rescoring",
    payload,
    `Score each item 1-10 on how much it MOVES Moria's thesis. Scoring key:
  10 = directly affects a held position or watchlist protocol (e.g. Aave fee switch, Hyperliquid governance, Pendle treasury move)
  8-9 = regulatory decision that changes the playing field for DeFi/commodities/RWA (SEC rulings, MiCA updates, commodity tokenization)
  6-7 = sector-level story that moves our theme (DeFi TVL trends, stablecoin developments, RWA inflows)
  4-5 = tangential — crypto industry news that doesn't directly touch our thesis
  1-3 = noise — generic market moves, price commentary, macro reactions unrelated to our positions

Respond with ONE JSON object only (no prose, no markdown fence):
{
  "scores": [
    {"idx": 0, "score": 8, "reason": "brief 5-word why"},
    {"idx": 1, "score": 3, "reason": "..."}
  ]
}

Rules:
- Use ONLY the items I gave you. Do not invent items.
- Every idx from 0 to ${toScore.length - 1} must appear in your output.
- "reason" must be 5-15 words, factual, no speculation.`,
    3000,
  );

  if (response.confidence === "STUB") {
    return { rescored: candidates, confidence: "STUB" };
  }

  // Try to parse the JSON response
  try {
    // Extract JSON from response (Sonnet sometimes wraps in code fences)
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.scores)) throw new Error("scores is not an array");

    // Apply scores back to candidates
    const scoresByIdx: Record<number, { score: number; reason: string }> = {};
    for (const s of parsed.scores) {
      if (typeof s.idx === "number" && typeof s.score === "number") {
        scoresByIdx[s.idx] = {
          score: Math.max(1, Math.min(10, s.score)),
          reason: typeof s.reason === "string" ? s.reason : "",
        };
      }
    }

    // Apply scores to candidates
    const rescored = candidates.map((item, idx) => {
      if (idx < toScore.length && scoresByIdx[idx]) {
        return {
          ...item,
          thesis_score: scoresByIdx[idx].score,
          thesis_reason: scoresByIdx[idx].reason,
        };
      }
      return item;
    });

    // Sort by thesis_score (desc) for items that got scored, keep others at end
    rescored.sort((a, b) => {
      const aScore = a.thesis_score ?? -1;
      const bScore = b.thesis_score ?? -1;
      if (bScore !== aScore) return bScore - aScore;
      // Fall back to published date
      return new Date(b.published).getTime() - new Date(a.published).getTime();
    });

    return { rescored, confidence: response.confidence };
  } catch (err) {
    console.warn(`[aragorn] Sonnet rescoring parse failed:`, err instanceof Error ? err.message : err);
    return { rescored: candidates, confidence: "GUESS" };
  }
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function scoreTitle(
  title: string,
  snippet: string,
  weight: number,
): { score: number; matched: string[] } {
  const text = (title + " " + (snippet || "")).toLowerCase();
  const matched: string[] = [];
  let score = 0;

  // Helper: word-boundary match (avoids matching "ens" inside "sensors")
  const containsWord = (haystack: string, word: string): boolean => {
    // Allow multi-word phrases to match as substrings; single words need boundaries
    if (word.includes(" ")) return haystack.includes(word);
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`);
    return re.test(haystack);
  };

  for (const kw of HIGH_VALUE_KEYWORDS) {
    if (containsWord(text, kw)) {
      matched.push(kw);
      score += 3;
    }
  }
  for (const kw of MEDIUM_VALUE_KEYWORDS) {
    if (containsWord(text, kw)) {
      matched.push(kw);
      score += 1;
    }
  }

  // Source weight multiplier
  score = score * (weight / 5);

  return { score, matched };
}

function scoreToPriority(score: number): Priority {
  if (score >= 6) return "high";
  if (score >= 2) return "medium";
  return "low";
}

// Simple hash for deduplication
function hashTitle(title: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const words = normalized.split(/\s+/).slice(0, 5).join(" ");
  return words;
}

async function fetchSource(
  parser: Parser,
  source: Source,
): Promise<{ items: IntelligenceItem[]; error?: string }> {
  try {
    const feed = await parser.parseURL(source.url);
    const items: IntelligenceItem[] = [];

    for (const entry of feed.items.slice(0, 15)) {
      const title = entry.title || "";
      const link = entry.link || "";
      const published = entry.isoDate || entry.pubDate || new Date().toISOString();
      const snippet = stripHtml(entry.contentSnippet || entry.content || "").slice(0, 200);

      if (!title || !link) continue;

      const { score, matched } = scoreTitle(title, snippet, source.weight);

      items.push({
        id: `${source.name}-${hashTitle(title)}`,
        source: source.name,
        source_weight: source.weight,
        title,
        link,
        category: source.category,
        priority: scoreToPriority(score),
        priority_score: score,
        matched_keywords: matched,
        published,
        snippet: snippet || undefined,
      });
    }

    return { items };
  } catch (err) {
    return {
      items: [],
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function fetchIntelligence(): Promise<IntelligenceData> {
  console.log("[aragorn] Fetching intelligence feeds...");

  const parser = new Parser({
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Conclave/1.0; +https://conclave01.vercel.app)",
    },
  });

  const results = await Promise.all(SOURCES.map((s) => fetchSource(parser, s).then((r) => ({ ...r, source: s }))));

  // Flatten + deduplicate
  const allItems: IntelligenceItem[] = [];
  const seen = new Set<string>();
  const failedSources: string[] = [];
  let succeededCount = 0;

  for (const r of results) {
    if (r.error) {
      failedSources.push(`${r.source.name}: ${r.error}`);
      continue;
    }
    succeededCount++;

    for (const item of r.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allItems.push(item);
      }
    }
  }

  // Initial sort by keyword priority score (desc), then by date (desc)
  allItems.sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    return new Date(b.published).getTime() - new Date(a.published).getTime();
  });

  // Sonnet rescoring — replaces keyword sort for the top 30 candidates with
  // real semantic thesis-relevance scoring. Falls back gracefully if Sonnet
  // fails or ANTHROPIC_API_KEY is missing.
  const { rescored: sortedItems, confidence: sonnetConfidence } = await rescoreWithSonnet(allItems);

  // Group by category (using the rescored order)
  const byCategory: Record<Category, IntelligenceItem[]> = {
    commodity: [],
    defi: [],
    regulatory: [],
    company: [],
    exploits: [],
  };
  for (const item of sortedItems) {
    byCategory[item.category].push(item);
  }

  // Top stories: prefer items with high thesis_score (Sonnet-verified) over
  // keyword priority. If Sonnet skipped, fall back to keyword priority.
  const topStories = sortedItems
    .filter((i) => {
      if (i.thesis_score !== undefined) return i.thesis_score >= 6;
      return i.priority !== "low";
    })
    .slice(0, 10);

  const byPriority: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
  for (const item of sortedItems) byPriority[item.priority]++;

  const byCategoryCount: Record<Category, number> = {
    commodity: byCategory.commodity.length,
    defi: byCategory.defi.length,
    regulatory: byCategory.regulatory.length,
    company: byCategory.company.length,
    exploits: byCategory.exploits.length,
  };

  const rescoredCount = sortedItems.filter((i) => i.thesis_score !== undefined).length;

  const data: IntelligenceData = {
    updated_at: new Date().toISOString(),
    categories: byCategory,
    top_stories: topStories,
    summary: {
      total_items: sortedItems.length,
      by_category: byCategoryCount,
      by_priority: byPriority,
      sources_succeeded: succeededCount,
      sources_failed: failedSources.length,
      failed_sources: failedSources,
      sonnet_rescored: rescoredCount,
      sonnet_confidence: sonnetConfidence,
    },
  };

  console.log(
    `[aragorn] ${succeededCount}/${SOURCES.length} sources OK · ${allItems.length} items · ${byPriority.high} high priority`,
  );
  if (failedSources.length > 0) {
    console.log(`[aragorn] Failed: ${failedSources.slice(0, 3).join(", ")}${failedSources.length > 3 ? "..." : ""}`);
  }

  return data;
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchIntelligence()
    .then((data) => {
      writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
      console.log(`[aragorn] Wrote ${OUT_PATH}`);
    })
    .catch((err) => {
      console.error("[aragorn] Failed:", err);
      process.exit(1);
    });
}
