/**
 * Thorin — Protocol Watcher
 * Fetches governance proposals from Snapshot GraphQL for every protocol in the portfolio.
 * Free, no API key required.
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sonnet, hasAnthropicKey } from "./lib/llm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOVERNANCE_PATH = resolve(__dirname, "../portal/data/governance.json");

// Snapshot spaces to watch — each protocol we hold
const SNAPSHOT_SPACES = [
  { space: "aave.eth", protocol: "AAVE", label: "Aave DAO" },
  { space: "uniswapgovernance.eth", protocol: "UNI", label: "Uniswap" },
  { space: "morpho.eth", protocol: "MORPHO", label: "Morpho" },
  { space: "pendlecontrol.eth", protocol: "PENDLE", label: "Pendle" },
  { space: "lido-snapshot.eth", protocol: "LDO", label: "Lido" },
  { space: "ens.eth", protocol: "ENS", label: "ENS" },
] as const;

export interface GovernanceAlert {
  id: string;
  protocol: string;
  title: string;
  body?: string;
  source: "snapshot" | "tally" | "forum";
  space: string;
  space_label: string;
  status: "active" | "closed" | "pending";
  created: string;
  voting_ends: string;
  author: string;
  scores_total: number;
  quorum: number;
  current_result: {
    for: number;
    against: number;
    abstain?: number;
    quorum_met: boolean;
  };
  relevance: "high" | "medium" | "low";
  impact: string;
  url: string;
  /**
   * Sonnet-generated fields (only present when ANTHROPIC_API_KEY is set)
   */
  ai_summary?: string;        // 2-sentence plain English
  ai_impact_score?: number;   // 1-10 material impact to Moria if it passes
  ai_impact_reason?: string;  // 5-15 word justification
}

export interface GovernanceData {
  updated_at: string;
  source: "snapshot";
  active: GovernanceAlert[];
  recent_closed: GovernanceAlert[];
  summary: {
    active_count: number;
    high_relevance: number;
    protocols_with_activity: string[];
  };
}

/**
 * Score a proposal's relevance to our portfolio based on keywords.
 * High = fee switch, treasury, core parameter, emissions, security module
 * Medium = grants, integrations, partnerships
 * Low = meta/admin stuff
 */
function scoreRelevance(title: string, body: string = ""): "high" | "medium" | "low" {
  const text = (title + " " + body).toLowerCase();

  const highKeywords = [
    "fee switch",
    "fee distribution",
    "buyback",
    "burn",
    "emission",
    "emissions",
    "treasury",
    "safety module",
    "liquidation",
    "oracle",
    "parameter",
    "interest rate",
    "utilization",
    "collateral factor",
    "loan-to-value",
    "ltv",
    "deprecate",
    "pause",
    "upgrade",
    "v4",
    "v5",
    "security",
    "exploit",
    "hack",
    "whitelist asset",
    "add asset",
    "list asset",
    "staking reward",
    "governance attack",
  ];

  const mediumKeywords = [
    "grant",
    "partnership",
    "integration",
    "deployment",
    "chain expansion",
    "arbitrum",
    "base",
    "optimism",
    "polygon",
    "delegate",
    "compensation",
    "audit",
    "working group",
  ];

  for (const kw of highKeywords) if (text.includes(kw)) return "high";
  for (const kw of mediumKeywords) if (text.includes(kw)) return "medium";
  return "low";
}

function generateImpact(title: string, relevance: "high" | "medium" | "low", protocol: string): string {
  if (relevance === "high") {
    return `High-impact proposal affecting ${protocol} directly — review required`;
  }
  if (relevance === "medium") {
    return `Medium impact — operational change for ${protocol}`;
  }
  return `Low impact — administrative`;
}

async function fetchSnapshotProposals(
  space: string,
  state: "active" | "closed",
  first: number = 5,
) {
  const query = `
    query {
      proposals(
        first: ${first},
        skip: 0,
        where: {
          space_in: ["${space}"],
          state: "${state}"
        },
        orderBy: "created",
        orderDirection: desc
      ) {
        id
        title
        body
        choices
        start
        end
        snapshot
        state
        author
        created
        scores
        scores_total
        quorum
        link
      }
    }
  `;

  try {
    const res = await fetch("https://hub.snapshot.org/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      console.warn(`[thorin] Snapshot fetch failed for ${space}: ${res.status}`);
      return [];
    }

    const json = await res.json();
    if (json.errors) {
      console.warn(`[thorin] Snapshot GraphQL errors:`, json.errors);
      return [];
    }

    return json.data?.proposals || [];
  } catch (err) {
    console.warn(`[thorin] Snapshot fetch error for ${space}:`, err);
    return [];
  }
}

function snapshotProposalToAlert(
  p: any,
  protocol: string,
  space: string,
  spaceLabel: string,
): GovernanceAlert {
  const body = (p.body || "").slice(0, 500);
  const relevance = scoreRelevance(p.title, body);

  // Parse voting results from scores[] + choices[]
  const scores: number[] = p.scores || [];
  const choices: string[] = p.choices || [];
  const scoresTotal = p.scores_total || 0;

  let forScore = 0;
  let againstScore = 0;
  let abstainScore = 0;

  choices.forEach((choice: string, i: number) => {
    const lower = choice.toLowerCase();
    const score = scores[i] || 0;
    if (lower.includes("for") || lower.includes("yes") || lower.includes("approve")) {
      forScore += score;
    } else if (
      lower.includes("against") ||
      lower.includes("no") ||
      lower.includes("reject")
    ) {
      againstScore += score;
    } else if (lower.includes("abstain")) {
      abstainScore += score;
    }
  });

  // Fallback: if no for/against keywords, use first two choices
  if (forScore === 0 && againstScore === 0 && scores.length >= 2) {
    forScore = scores[0];
    againstScore = scores[1];
  }

  const total = forScore + againstScore + abstainScore || 1;
  const forPct = (forScore / total) * 100;
  const againstPct = (againstScore / total) * 100;
  const abstainPct = (abstainScore / total) * 100;

  const quorumMet = scoresTotal >= (p.quorum || 0);

  return {
    id: p.id,
    protocol,
    title: p.title,
    body: body,
    source: "snapshot",
    space,
    space_label: spaceLabel,
    status: p.state === "active" ? "active" : "closed",
    created: new Date(p.created * 1000).toISOString(),
    voting_ends: new Date(p.end * 1000).toISOString(),
    author: p.author,
    scores_total: scoresTotal,
    quorum: p.quorum || 0,
    current_result: {
      for: parseFloat(forPct.toFixed(1)),
      against: parseFloat(againstPct.toFixed(1)),
      abstain: parseFloat(abstainPct.toFixed(1)),
      quorum_met: quorumMet,
    },
    relevance,
    impact: generateImpact(p.title, relevance, protocol),
    url: p.link || `https://snapshot.org/#/${space}/proposal/${p.id}`,
  };
}

// ─────────────────────────────────────────────────
// Sonnet proposal summarizer — reads full body, writes 2-sentence English
// ─────────────────────────────────────────────────
async function summarizeProposalsWithSonnet(
  active: GovernanceAlert[],
): Promise<{ enriched: GovernanceAlert[]; summarized: number }> {
  if (!hasAnthropicKey() || active.length === 0) {
    return { enriched: active, summarized: 0 };
  }

  // Only process proposals with a body (some come body-less from Snapshot)
  const withBody = active.filter((p) => p.body && p.body.trim().length > 50);
  if (withBody.length === 0) return { enriched: active, summarized: 0 };

  // Cap to 15 per run to keep costs bounded
  const toSummarize = withBody.slice(0, 15);

  // Build compact payload for Sonnet
  const payload = {
    thesis:
      "Moria Capital holds AAVE, HYPE (Hyperliquid), PENDLE, MORPHO, UNI, wstETH (Lido), COW, ETH. We care most about proposals that affect fee switches, treasury deployment, emissions, security modules, collateral parameters, or protocol upgrades.",
    proposals: toSummarize.map((p, idx) => ({
      idx,
      protocol: p.protocol,
      title: p.title,
      body: p.body!.slice(0, 1200),
    })),
  };

  const response = await sonnet(
    "Thorin — Snapshot proposal summarization",
    payload,
    `For each proposal, produce a 2-sentence plain English summary + a 1-10 impact score for Moria's portfolio.

Scoring key:
  10 = direct token-holder impact (fee switch flip, buyback, emissions cut)
  8-9 = material change affecting a held position (collateral parameter, safety module)
  6-7 = meaningful operational change (upgrade, integration)
  4-5 = neutral administrative change
  1-3 = DAO housekeeping (delegate signals, grants, cosmetic)

Respond with ONE JSON object only (no markdown fence, no prose):
{
  "summaries": [
    {
      "idx": 0,
      "summary": "Two-sentence plain English. First sentence: what the proposal does. Second sentence: what changes if it passes.",
      "impact_score": 7,
      "impact_reason": "5-15 word justification"
    }
  ]
}

Rules:
- Use ONLY facts from the proposal body I gave you. Do not speculate.
- Every idx from 0 to ${toSummarize.length - 1} must appear in your output.
- Keep "summary" to exactly 2 sentences, plain English.`,
    4000,
  );

  if (response.confidence === "STUB") {
    return { enriched: active, summarized: 0 };
  }

  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.summaries)) throw new Error("summaries not an array");

    const byIdx: Record<number, { summary: string; impact_score: number; impact_reason: string }> = {};
    for (const s of parsed.summaries) {
      if (typeof s.idx === "number") {
        byIdx[s.idx] = {
          summary: typeof s.summary === "string" ? s.summary : "",
          impact_score: typeof s.impact_score === "number" ? Math.max(1, Math.min(10, s.impact_score)) : 5,
          impact_reason: typeof s.impact_reason === "string" ? s.impact_reason : "",
        };
      }
    }

    // Apply to the original `active` list. Match by identity via toSummarize.
    const enriched = active.map((proposal) => {
      const toIdx = toSummarize.findIndex((t) => t.id === proposal.id);
      if (toIdx >= 0 && byIdx[toIdx]) {
        return {
          ...proposal,
          ai_summary: byIdx[toIdx].summary,
          ai_impact_score: byIdx[toIdx].impact_score,
          ai_impact_reason: byIdx[toIdx].impact_reason,
        };
      }
      return proposal;
    });

    return { enriched, summarized: Object.keys(byIdx).length };
  } catch (err) {
    console.warn(`[thorin] Sonnet summarization parse failed:`, err instanceof Error ? err.message : err);
    return { enriched: active, summarized: 0 };
  }
}

export async function fetchGovernance(): Promise<GovernanceData> {
  console.log("[thorin] Fetching governance proposals from Snapshot...");

  const active: GovernanceAlert[] = [];
  const closed: GovernanceAlert[] = [];
  const protocolsWithActivity = new Set<string>();

  // Fetch in parallel across spaces
  const fetches = SNAPSHOT_SPACES.map(async ({ space, protocol, label }) => {
    const [activeProps, closedProps] = await Promise.all([
      fetchSnapshotProposals(space, "active", 5),
      fetchSnapshotProposals(space, "closed", 3),
    ]);

    return { space, protocol, label, activeProps, closedProps };
  });

  const results = await Promise.all(fetches);

  for (const { space, protocol, label, activeProps, closedProps } of results) {
    for (const p of activeProps) {
      active.push(snapshotProposalToAlert(p, protocol, space, label));
      protocolsWithActivity.add(protocol);
    }
    for (const p of closedProps) {
      closed.push(snapshotProposalToAlert(p, protocol, space, label));
    }
  }

  // Sort: active by voting_ends soonest, closed by created newest
  active.sort((a, b) => new Date(a.voting_ends).getTime() - new Date(b.voting_ends).getTime());
  closed.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  // Sonnet enriches active proposals with plain-English summaries + impact scores
  const { enriched: enrichedActive, summarized } = await summarizeProposalsWithSonnet(active);

  const data: GovernanceData = {
    updated_at: new Date().toISOString(),
    source: "snapshot",
    active: enrichedActive,
    recent_closed: closed.slice(0, 10),
    summary: {
      active_count: enrichedActive.length,
      high_relevance: enrichedActive.filter((a) => a.relevance === "high").length,
      protocols_with_activity: Array.from(protocolsWithActivity),
    },
  };

  console.log(
    `[thorin] ${enrichedActive.length} active proposals · ${data.summary.high_relevance} high relevance · ${summarized} AI-summarized`,
  );

  return data;
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchGovernance()
    .then((data) => {
      writeFileSync(GOVERNANCE_PATH, JSON.stringify(data, null, 2));
      console.log(`[thorin] Wrote ${GOVERNANCE_PATH}`);
      console.log(`[thorin] Active: ${data.active.length}, Closed: ${data.recent_closed.length}`);
    })
    .catch((err) => {
      console.error("[thorin] Failed:", err);
      process.exit(1);
    });
}
