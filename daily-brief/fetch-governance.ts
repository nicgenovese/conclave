/**
 * Thorin — Protocol Watcher
 * Fetches governance proposals from Snapshot GraphQL for every protocol in the portfolio.
 * Free, no API key required.
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

  const data: GovernanceData = {
    updated_at: new Date().toISOString(),
    source: "snapshot",
    active,
    recent_closed: closed.slice(0, 10),
    summary: {
      active_count: active.length,
      high_relevance: active.filter((a) => a.relevance === "high").length,
      protocols_with_activity: Array.from(protocolsWithActivity),
    },
  };

  console.log(
    `[thorin] Found ${active.length} active proposals (${data.summary.high_relevance} high relevance) across ${protocolsWithActivity.size} protocols`,
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
