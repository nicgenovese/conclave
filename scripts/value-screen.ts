#!/usr/bin/env tsx
/**
 * /value-screen — DeFi value investing screener (deterministic)
 *
 * Reads gimli.json and produces a ranked buy list filtered by:
 *  - P/E ratio vs TradFi peer range
 *  - Fee switch state (prefer live_full > live_partial > live_buyback > not_activated)
 *  - Market cap floor (configurable)
 *  - Minimum upside to peer multiple
 *
 * This is the core of Moria's thesis: "DeFi infrastructure at 2-9x earnings,
 * TradFi peers at 15-25x, the discount is structural."
 *
 * Usage:
 *   npx tsx scripts/value-screen.ts                         # full screen
 *   npx tsx scripts/value-screen.ts --cheap-only            # just valuation:cheap
 *   npx tsx scripts/value-screen.ts --live-switch-only      # only fee switch live
 *   npx tsx scripts/value-screen.ts --min-upside 50         # min 50% upside
 *   npx tsx scripts/value-screen.ts --watchlist             # exclude Portfolio, show new ideas
 *   npx tsx scripts/value-screen.ts --json                  # machine-readable
 *
 * Zero LLM. Deterministic. Verifiable against gimli.json.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GIMLI_PATH = resolve(__dirname, "../portal/data/gimli.json");

// ─────────────────────────────────────────────
// CLI arg parsing
// ─────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = new Set<string>();
  const pairs: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        pairs[key] = next;
        i++;
      } else {
        flags.add(key);
      }
    }
  }

  return {
    cheapOnly: flags.has("cheap-only"),
    liveSwitchOnly: flags.has("live-switch-only"),
    watchlistOnly: flags.has("watchlist"),
    jsonMode: flags.has("json"),
    minUpside: pairs["min-upside"] ? parseFloat(pairs["min-upside"]) : null,
    minMcap: pairs["min-mcap"] ? parseFloat(pairs["min-mcap"]) : null,
  };
}

// ─────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────

function usd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

const FEE_SWITCH_ICON: Record<string, string> = {
  live_full: "🟢",
  live_partial: "🟡",
  live_buyback: "🟡",
  not_activated: "🔴",
  unknown: "⚪",
};

function feeSwitchLabel(state: string): string {
  return FEE_SWITCH_ICON[state] || "⚪";
}

const VALUATION_ICON: Record<string, string> = {
  cheap: "✅",
  fair: "◯",
  expensive: "⚠️ ",
  unknown: "? ",
};

function valuationLabel(v: string): string {
  return VALUATION_ICON[v] || "? ";
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main() {
  const opts = parseArgs();

  if (!existsSync(GIMLI_PATH)) {
    console.error(`gimli.json not found. Run the pipeline first.`);
    process.exit(1);
  }

  let gimli: any;
  try {
    gimli = JSON.parse(readFileSync(GIMLI_PATH, "utf-8"));
  } catch (err) {
    console.error(`Failed to parse gimli.json: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  let protocols = (gimli.protocols || []) as any[];

  // ─────── Apply filters ───────
  if (opts.cheapOnly) {
    protocols = protocols.filter((p) => p.valuation === "cheap");
  }

  if (opts.liveSwitchOnly) {
    protocols = protocols.filter((p) => {
      const state = p.fee_switch?.state;
      return state === "live_full" || state === "live_partial" || state === "live_buyback";
    });
  }

  if (opts.watchlistOnly) {
    protocols = protocols.filter((p) => p.theme && p.theme !== "Portfolio");
  }

  if (opts.minUpside !== null) {
    protocols = protocols.filter(
      (p) => p.upside_to_peer_pct !== null && p.upside_to_peer_pct >= opts.minUpside!,
    );
  }

  if (opts.minMcap !== null) {
    protocols = protocols.filter((p) => p.market_cap && p.market_cap >= opts.minMcap!);
  }

  // Sort: cheapest first, with upside as tiebreak
  protocols = protocols.sort((a, b) => {
    const valOrder = { cheap: 0, fair: 1, expensive: 2, unknown: 3 };
    const av = valOrder[a.valuation as keyof typeof valOrder] ?? 4;
    const bv = valOrder[b.valuation as keyof typeof valOrder] ?? 4;
    if (av !== bv) return av - bv;
    return (b.upside_to_peer_pct ?? -Infinity) - (a.upside_to_peer_pct ?? -Infinity);
  });

  // ─────── JSON mode ───────
  if (opts.jsonMode) {
    console.log(JSON.stringify({
      filters: opts,
      count: protocols.length,
      protocols: protocols.map((p) => ({
        ticker: p.ticker,
        name: p.name,
        theme: p.theme,
        market_cap: p.market_cap,
        pe_ratio: p.pe_ratio,
        valuation: p.valuation,
        upside_to_peer_pct: p.upside_to_peer_pct,
        fee_switch_state: p.fee_switch?.state,
        fee_switch_holder_pct: p.fee_switch?.holder_pct,
      })),
    }, null, 2));
    return;
  }

  // ─────── Pretty output ───────
  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════════════╗");
  console.log("║                 MORIA VALUE SCREENER (Gimli)                      ║");
  console.log("╚═══════════════════════════════════════════════════════════════════╝");
  console.log("");

  // Filter summary
  const filterDesc: string[] = [];
  if (opts.cheapOnly) filterDesc.push("cheap only");
  if (opts.liveSwitchOnly) filterDesc.push("live fee switch");
  if (opts.watchlistOnly) filterDesc.push("watchlist only (not portfolio)");
  if (opts.minUpside !== null) filterDesc.push(`min upside ${opts.minUpside}%`);
  if (opts.minMcap !== null) filterDesc.push(`min mcap ${usd(opts.minMcap)}`);
  if (filterDesc.length > 0) {
    console.log(`  Filters: ${filterDesc.join(" · ")}`);
  } else {
    console.log("  Filters: none (all analyzable protocols)");
  }
  console.log(`  Total analyzed: ${gimli.summary?.total_analyzed ?? "?"} · Shown: ${protocols.length}`);
  console.log(`  Thesis: 2-9x P/E (DeFi) vs 15-25x (TradFi) — discount is structural`);
  console.log("");

  if (protocols.length === 0) {
    console.log("  No protocols match the filters.");
    console.log("");
    return;
  }

  // Header
  console.log("  ┌─────────┬──────────┬──────────┬──────────┬──────────┬────────────┬─────┐");
  console.log("  │ Ticker  │  P/E     │  Peer    │  Upside  │  MCap    │  Fee Switch│ Val │");
  console.log("  ├─────────┼──────────┼──────────┼──────────┼──────────┼────────────┼─────┤");

  for (const p of protocols) {
    const ticker = (p.ticker || "?").padEnd(7);
    const pe = p.pe_ratio !== null ? `${p.pe_ratio.toFixed(1)}x`.padStart(8) : "     —  ";
    const peer = (p.peer_pe_range || "—").padStart(8);
    const upside = p.upside_to_peer_pct !== null
      ? `${p.upside_to_peer_pct >= 0 ? "+" : ""}${p.upside_to_peer_pct.toFixed(0)}%`.padStart(8)
      : "     —  ";
    const mcap = usd(p.market_cap).padStart(8);
    const fsState = (p.fee_switch?.state || "unknown").replace(/_/g, " ").padEnd(10);
    const fsIcon = feeSwitchLabel(p.fee_switch?.state || "unknown");
    const val = valuationLabel(p.valuation) + " ";
    console.log(`  │ ${ticker} │ ${pe} │ ${peer} │ ${upside} │ ${mcap} │ ${fsIcon}${fsState}│ ${val}│`);
  }
  console.log("  └─────────┴──────────┴──────────┴──────────┴──────────┴────────────┴─────┘");
  console.log("");

  // ─────── Spotlight: top 3 with the full picture ───────
  console.log("  Top 3 by upside to peer:");
  const top3 = [...protocols].slice(0, 3);
  for (const p of top3) {
    console.log("");
    console.log(`  ► ${p.ticker} — ${p.name}`);
    console.log(`    Theme:    ${p.theme}`);
    console.log(`    P/E:      ${p.pe_ratio?.toFixed(1) ?? "—"}x   vs peer mid ${p.peer_pe_mid}x (${p.tradfi_peer})`);
    console.log(`    Upside:   +${p.upside_to_peer_pct?.toFixed(0) ?? "—"}% to peer midpoint`);
    console.log(`    Fees:     ${usd(p.fees_annualized)}/yr annualized`);
    console.log(`    Revenue:  ${usd(p.revenue_annualized)}/yr annualized`);
    console.log(`    TVL:      ${usd(p.tvl)}`);
    console.log(`    MCap:     ${usd(p.market_cap)}`);
    const fs = p.fee_switch || {};
    console.log(`    Switch:   ${feeSwitchLabel(fs.state)} ${fs.state || "unknown"} (${fs.holder_pct ?? 0}% to holders)`);
    if (fs.note) console.log(`              ${fs.note}`);
  }
  console.log("");

  // ─────── Footer ───────
  console.log(`  Source: portal/data/gimli.json · updated ${gimli.updated_at?.slice(0, 19).replace("T", " ") ?? "?"} UTC`);
  console.log("");
  console.log("  Next: run `npx tsx scripts/position.ts <TICKER>` for a single-position deep dive");
  console.log("        or `/conclave <TICKER> <focus>` inside Claude Code for a 5-page decision memo");
  console.log("");
}

main();
