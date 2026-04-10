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
  };
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

  // Sort by priority score (desc), then by date (desc)
  allItems.sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    return new Date(b.published).getTime() - new Date(a.published).getTime();
  });

  // Group by category
  const byCategory: Record<Category, IntelligenceItem[]> = {
    commodity: [],
    defi: [],
    regulatory: [],
    company: [],
    exploits: [],
  };
  for (const item of allItems) {
    byCategory[item.category].push(item);
  }

  // Top stories: top 10 by score across all categories (minus low)
  const topStories = allItems.filter((i) => i.priority !== "low").slice(0, 10);

  const byPriority: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
  for (const item of allItems) byPriority[item.priority]++;

  const byCategoryCount: Record<Category, number> = {
    commodity: byCategory.commodity.length,
    defi: byCategory.defi.length,
    regulatory: byCategory.regulatory.length,
    company: byCategory.company.length,
    exploits: byCategory.exploits.length,
  };

  const data: IntelligenceData = {
    updated_at: new Date().toISOString(),
    categories: byCategory,
    top_stories: topStories,
    summary: {
      total_items: allItems.length,
      by_category: byCategoryCount,
      by_priority: byPriority,
      sources_succeeded: succeededCount,
      sources_failed: failedSources.length,
      failed_sources: failedSources,
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
