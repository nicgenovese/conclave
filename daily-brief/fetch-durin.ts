/**
 * Durin — The Chronicler (Tier 3, Synthesis Agent)
 *
 * Durin reads ALL outputs from the other 5 agents (Ori, Gimli, Thorin,
 * Aragorn, Elrond) and writes a 3-section morning brief:
 *
 *  1. "What moved overnight and why it matters to us"
 *     — Price changes, governance votes, regime shifts. Specific numbers
 *       from Ori + Elrond + Gimli.
 *
 *  2. "Risks today"
 *     — Stop-loss proximity, concentration breaches, macro risk signals,
 *       exploit headlines. Pulls from Ori alerts + Aragorn exploits + risk-alerts.
 *
 *  3. "Decisions to consider this week"
 *     — Governance votes due, Gimli valuation shifts, macro regime changes,
 *       Aragorn high-relevance headlines.
 *
 * Modes:
 *  - CRON mode (this file): Sonnet, ~$0.10/run, scheduled via GitHub Actions
 *  - INTERACTIVE mode (~/.claude/skills/durin/): Opus, free under Max
 *    Triggered by typing /durin in Claude Code
 *
 * Both modes are grounded — every number Durin cites must exist in the
 * JSON files from the other agents. Post-validation enforces this.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sonnet, hasAnthropicKey } from "./lib/llm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../portal/data");
const OUT_PATH = resolve(DATA_DIR, "durin-brief.json");

// ─────────────────────────────────────────────────
// Safe readers for each agent output
// ─────────────────────────────────────────────────

function readJson<T>(filename: string): T | null {
  try {
    const p = resolve(DATA_DIR, filename);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as T;
  } catch (err) {
    console.warn(`[durin] Could not read ${filename}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ─────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────

export interface DurinBrief {
  updated_at: string;
  model: string;
  confidence: "FACT" | "INFERENCE" | "GUESS" | "STUB";

  /** 3 narrative sections, each ~3-5 sentences. */
  what_moved: string;
  risks_today: string;
  decisions_this_week: string;

  /** Quick reference stats for the dashboard card */
  summary: {
    nav_usd: number | null;
    positions_count: number | null;
    macro_regime: string | null;
    cheap_defi_count: number | null;
    high_relevance_governance: number | null;
    critical_risk_alerts: number | null;
    high_priority_news: number | null;
  };

  /** Provenance — what Durin actually read */
  sources: {
    ori: boolean;
    gimli: boolean;
    thorin: boolean;
    aragorn: boolean;
    elrond: boolean;
  };

  /** Cost tracking */
  cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
}

// ─────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────

export async function fetchDurin(): Promise<DurinBrief> {
  console.log("[durin] Reading all agent outputs...");

  // Load every agent output — each can be null if that agent hasn't run yet
  type AnyRec = Record<string, unknown>;
  const ori = readJson<AnyRec>("ori.json");
  const gimli = readJson<AnyRec>("gimli.json");
  const thorin = readJson<AnyRec>("governance.json");
  const aragorn = readJson<AnyRec>("intelligence.json");
  const elrond = readJson<AnyRec>("macro-data.json");
  const riskAlerts = readJson<AnyRec>("risk-alerts.json");

  const sources = {
    ori: !!ori,
    gimli: !!gimli,
    thorin: !!thorin,
    aragorn: !!aragorn,
    elrond: !!elrond,
  };

  console.log(`[durin] Sources available: ${Object.entries(sources).filter(([, v]) => v).map(([k]) => k).join(", ")}`);

  // Build compact summary stats — deterministic, always work
  const summary: DurinBrief["summary"] = {
    nav_usd: (ori?.nav_usd as number | undefined) ?? null,
    positions_count: ori ? ((ori.positions as unknown[] | undefined)?.length ?? null) : null,
    macro_regime: (elrond?.regime as string | undefined) ?? null,
    cheap_defi_count: (gimli?.summary as { cheap?: number } | undefined)?.cheap ?? null,
    high_relevance_governance: (thorin?.summary as { high_relevance?: number } | undefined)?.high_relevance ?? null,
    critical_risk_alerts: (riskAlerts?.summary as { critical?: number } | undefined)?.critical ?? null,
    high_priority_news: (aragorn?.summary as { by_priority?: { high?: number } } | undefined)?.by_priority?.high ?? null,
  };

  // Build the grounded payload for Sonnet — compact, only what Durin needs
  // to write a brief. We extract just the fields that matter and round numbers
  // so Sonnet's citations don't fail post-validation on float precision.
  const payload = buildDurinPayload(ori, gimli, thorin, aragorn, elrond, riskAlerts);

  if (!hasAnthropicKey()) {
    return {
      updated_at: new Date().toISOString(),
      model: "stub",
      confidence: "STUB",
      what_moved: "Durin synthesis requires ANTHROPIC_API_KEY. All agent outputs are available — see individual JSON files for raw facts.",
      risks_today: "Live alerts available from Ori (ori.json) and risk-alerts.json. Check the dashboard FACT cards.",
      decisions_this_week: "See /governance for active proposals, /research for archived memos, /admin/research to trigger a Gandalf deep dive.",
      summary,
      sources,
      cost_usd: 0,
      input_tokens: 0,
      output_tokens: 0,
    };
  }

  // The Sonnet call — three separate grounded generations, one per section,
  // so hallucinations in one section don't taint the others.
  const [whatMovedResp, risksResp, decisionsResp] = await Promise.all([
    sonnet(
      "Durin — what moved",
      payload,
      `Write 3-5 sentences for the "What moved" section of Moria's morning brief.

Focus on:
- Macro regime state (from the regime field and numbers)
- DeFi valuation extremes (from gimli.cheapest[0] and gimli.most_expensive[0])
- Portfolio NAV state (from nav_usd)
- Any position that's moving relative to the portfolio

Tone: senior PM briefing a junior, direct and unemotional.
Rules: every number must come from the payload. Label each sentence FACT: or INFERENCE:.`,
      600,
    ),
    sonnet(
      "Durin — risks today",
      payload,
      `Write 3-5 sentences for the "Risks today" section of Moria's morning brief.

Focus on:
- Any active risk alerts (critical/warning/info from risk_alerts)
- Concentration state (from concentration)
- Any exploit or regulatory headlines from aragorn.top_exploits or top_regulatory
- High-impact governance proposals from thorin with ai_impact_score >= 7

If there are NO notable risks, say so directly in one sentence and stop.

Tone: direct, do not sugar-coat. Rules: every number from payload, FACT/INFERENCE labels.`,
      600,
    ),
    sonnet(
      "Durin — decisions this week",
      payload,
      `Write 3-5 sentences for the "Decisions to consider this week" section.

Focus on:
- Active governance proposals closing soon (use proposals.active with voting_ends)
- Cheapest DeFi valuations we don't yet own (gimli protocols with theme != 'Portfolio' and valuation='cheap')
- Any Aragorn high-priority headlines (thesis_score >= 8) that could trigger action
- Macro parallel implications (ai_parallel field)

Do NOT give direct buy/sell recommendations — just flag what deserves human judgment.
Rules: every number from payload, FACT/INFERENCE labels.`,
      600,
    ),
  ]);

  // Combine confidence: the worst label wins
  const confLevels = ["STUB", "GUESS", "INFERENCE", "FACT"] as const;
  const confs = [whatMovedResp.confidence, risksResp.confidence, decisionsResp.confidence];
  const worstIdx = Math.min(...confs.map((c) => confLevels.indexOf(c as (typeof confLevels)[number])));
  const finalConfidence = confLevels[worstIdx >= 0 ? worstIdx : 0];

  const totalCost =
    (whatMovedResp.costUsd || 0) + (risksResp.costUsd || 0) + (decisionsResp.costUsd || 0);
  const totalInputTok =
    (whatMovedResp.inputTokens || 0) + (risksResp.inputTokens || 0) + (decisionsResp.inputTokens || 0);
  const totalOutputTok =
    (whatMovedResp.outputTokens || 0) + (risksResp.outputTokens || 0) + (decisionsResp.outputTokens || 0);

  console.log(
    `[durin] Brief generated · confidence: ${finalConfidence} · cost: $${totalCost.toFixed(4)} · tokens: ${totalInputTok} in / ${totalOutputTok} out`,
  );

  return {
    updated_at: new Date().toISOString(),
    model: whatMovedResp.model,
    confidence: finalConfidence,
    what_moved: whatMovedResp.text,
    risks_today: risksResp.text,
    decisions_this_week: decisionsResp.text,
    summary,
    sources,
    cost_usd: totalCost,
    input_tokens: totalInputTok,
    output_tokens: totalOutputTok,
  };
}

// ─────────────────────────────────────────────────
// Payload builder — compact, grounded, rounded
// ─────────────────────────────────────────────────

function buildDurinPayload(
  ori: Record<string, unknown> | null,
  gimli: Record<string, unknown> | null,
  thorin: Record<string, unknown> | null,
  aragorn: Record<string, unknown> | null,
  elrond: Record<string, unknown> | null,
  riskAlerts: Record<string, unknown> | null,
): object {
  const round1 = (n: unknown) =>
    typeof n === "number" ? parseFloat(n.toFixed(1)) : null;
  const round0 = (n: unknown) =>
    typeof n === "number" ? Math.round(n) : null;

  // Portfolio state from Ori (rounded)
  const oriPositions = (ori?.positions as Array<Record<string, unknown>> | undefined) || [];
  const portfolio = ori
    ? {
        nav_usd: round0(ori.nav_usd),
        positions_count: oriPositions.length,
        top_positions: oriPositions.slice(0, 5).map((p) => ({
          ticker: p.ticker,
          value_usd: round0(p.value_usd),
          allocation_pct: round1(p.allocation_pct),
        })),
        concentration: ori.concentration,
        alerts_count: (ori.alerts as unknown[] | undefined)?.length || 0,
      }
    : null;

  // Gimli DeFi valuation (just the headline cheap/expensive)
  const defi_valuation = gimli
    ? {
        summary: gimli.summary,
        cheapest: ((gimli.cheapest as Array<Record<string, unknown>> | undefined) || []).slice(0, 3).map((p) => ({
          ticker: p.ticker,
          theme: p.theme,
          pe_ratio: round1(p.pe_ratio),
          peer_pe_mid: p.peer_pe_mid,
          upside_to_peer_pct: round0(p.upside_to_peer_pct),
          fee_switch_state: (p.fee_switch as { state?: string } | undefined)?.state,
        })),
        most_expensive: ((gimli.most_expensive as Array<Record<string, unknown>> | undefined) || []).slice(0, 2).map((p) => ({
          ticker: p.ticker,
          pe_ratio: round1(p.pe_ratio),
        })),
      }
    : null;

  // Thorin governance (just the high-impact ones)
  const activeProposals = (thorin?.active as Array<Record<string, unknown>> | undefined) || [];
  const governance = thorin
    ? {
        active_count: activeProposals.length,
        high_impact: activeProposals
          .filter((p) => {
            const score = p.ai_impact_score as number | undefined;
            return typeof score === "number" && score >= 7;
          })
          .map((p) => ({
            protocol: p.protocol,
            title: p.title,
            ai_impact_score: p.ai_impact_score,
            ai_summary: p.ai_summary,
            voting_ends: p.voting_ends,
          })),
      }
    : null;

  // Aragorn top news (high priority only)
  const topStories = (aragorn?.top_stories as Array<Record<string, unknown>> | undefined) || [];
  const news = aragorn
    ? {
        total_items: (aragorn.summary as { total_items?: number } | undefined)?.total_items,
        high_priority_count: (aragorn.summary as { by_priority?: { high?: number } } | undefined)?.by_priority?.high,
        top: topStories.slice(0, 8).map((s) => ({
          title: s.title,
          source: s.source,
          category: s.category,
          thesis_score: s.thesis_score,
          thesis_reason: s.thesis_reason,
        })),
      }
    : null;

  // Elrond macro
  const macro = elrond
    ? {
        regime: elrond.regime,
        regime_summary: elrond.regime_summary,
        fed_funds: round1((elrond.fed as { funds_rate?: { value?: unknown } } | undefined)?.funds_rate?.value),
        y10: round1((elrond.yields as { y10?: { value?: unknown } } | undefined)?.y10?.value),
        curve_2s10s_bps: (elrond.yields as { curve_2s10s_bps?: unknown } | undefined)?.curve_2s10s_bps,
        cpi_yoy: round1((elrond.inflation as { cpi_yoy_pct?: { value?: unknown } } | undefined)?.cpi_yoy_pct?.value),
        unrate: round1((elrond.employment as { unrate?: { value?: unknown } } | undefined)?.unrate?.value),
        nfci: round1((elrond.financial_conditions as { nfci?: { value?: unknown } } | undefined)?.nfci?.value),
        ai_parallel: elrond.ai_parallel,
      }
    : null;

  // Risk alerts (from Balin / Ori combined)
  const risks = riskAlerts
    ? {
        summary: riskAlerts.summary,
        top: ((riskAlerts.alerts as Array<Record<string, unknown>> | undefined) || []).slice(0, 5),
      }
    : null;

  return {
    portfolio,
    defi_valuation,
    governance,
    news,
    macro,
    risks,
  };
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchDurin()
    .then((data) => {
      writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
      console.log(`[durin] Wrote ${OUT_PATH}`);
    })
    .catch((err) => {
      console.error("[durin] Failed:", err);
      process.exit(1);
    });
}
