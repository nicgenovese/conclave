#!/usr/bin/env tsx
/**
 * /position <ticker> — deep dive on a single portfolio position
 *
 * Reads ori.json + gimli.json + governance.json + intelligence.json and
 * produces a single-position report: allocation, valuation vs peers, fee
 * switch state, active governance, relevant news.
 *
 * Usage:
 *   npx tsx scripts/position.ts AAVE
 *   npx tsx scripts/position.ts HYPE
 *   npx tsx scripts/position.ts PENDLE
 *
 * Zero LLM. Deterministic. <100ms.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../portal/data");

function readJson<T>(filename: string): T | null {
  try {
    const p = resolve(DATA_DIR, filename);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as T;
  } catch {
    return null;
  }
}

function usd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(digits)}%`;
}

function main() {
  const ticker = process.argv[2]?.toUpperCase();
  if (!ticker) {
    console.error("Usage: npx tsx scripts/position.ts <TICKER>");
    console.error("Example: npx tsx scripts/position.ts AAVE");
    process.exit(1);
  }

  const ori = readJson<any>("ori.json");
  const gimli = readJson<any>("gimli.json");
  const governance = readJson<any>("governance.json");
  const intelligence = readJson<any>("intelligence.json");

  if (!ori) {
    console.error("ori.json not found. Run `npx tsx daily-brief/run.ts` first.");
    process.exit(1);
  }

  // ─────── Look up in Ori ───────
  const oriPos = (ori.positions || []).find(
    (p: any) => p.ticker?.toUpperCase() === ticker,
  );

  // ─────── Look up in Gimli ───────
  const gimliPos = ((gimli?.protocols || []) as any[]).find(
    (p: any) => p.ticker?.toUpperCase() === ticker,
  );

  // ─────── Look up active Snapshot proposals ───────
  const proposals = ((governance?.active || []) as any[]).filter(
    (p: any) => p.protocol?.toUpperCase() === ticker,
  );

  // ─────── Top Aragorn stories mentioning this ticker ───────
  const allItems = [
    ...((intelligence?.categories?.commodity || []) as any[]),
    ...((intelligence?.categories?.defi || []) as any[]),
    ...((intelligence?.categories?.regulatory || []) as any[]),
    ...((intelligence?.categories?.company || []) as any[]),
    ...((intelligence?.categories?.exploits || []) as any[]),
  ];
  const newsItems = allItems
    .filter((item: any) => {
      const t = (item.title || "").toLowerCase();
      const s = (item.snippet || "").toLowerCase();
      return t.includes(ticker.toLowerCase()) || s.includes(ticker.toLowerCase());
    })
    .sort((a: any, b: any) => (b.thesis_score || 0) - (a.thesis_score || 0))
    .slice(0, 5);

  // ─────── Output ───────
  console.log("");
  console.log(`╔═══════════════════════════════════════════════════════╗`);
  console.log(`║   ${ticker.padEnd(10)} — Position Deep Dive                ║`);
  console.log(`╚═══════════════════════════════════════════════════════╝`);
  console.log("");

  if (!oriPos && !gimliPos) {
    console.log(`  ${ticker} is not in the portfolio or watchlist.`);
    console.log(`  Known tickers: ${((ori.positions || []) as any[]).map((p: any) => p.ticker).join(", ")}`);
    console.log("");
    return;
  }

  // Portfolio state
  if (oriPos) {
    console.log("  ─── PORTFOLIO STATE ───");
    console.log(`  Name:          ${oriPos.name}`);
    console.log(`  Value:         ${usd(oriPos.value_usd)}`);
    console.log(`  Allocation:    ${pct(oriPos.allocation_pct)} of ${usd(ori.nav_usd)} NAV`);
    console.log(`  Bucket:        ${oriPos.bucket ?? "—"}`);
    console.log(`  Chain:         ${oriPos.chain ?? "—"}`);
    console.log(`  Theme:         ${oriPos.theme ?? "—"}`);
    if (oriPos.price_usd) console.log(`  Unit price:    $${oriPos.price_usd.toFixed(4)}`);
    if (oriPos.balance) console.log(`  Balance:       ${oriPos.balance.toFixed(4)} tokens`);
    console.log("");
  } else {
    console.log("  ─── WATCHLIST (not owned) ───");
    console.log("");
  }

  // Valuation from Gimli
  if (gimliPos) {
    console.log("  ─── VALUATION (Gimli) ───");
    if (gimliPos.market_cap) console.log(`  Market cap:    ${usd(gimliPos.market_cap)}`);
    if (gimliPos.tvl) console.log(`  TVL:           ${usd(gimliPos.tvl)}`);
    if (gimliPos.fees_annualized) console.log(`  Fees (ann.):   ${usd(gimliPos.fees_annualized)}`);
    if (gimliPos.revenue_annualized) console.log(`  Revenue (ann): ${usd(gimliPos.revenue_annualized)}`);
    if (gimliPos.pf_ratio) console.log(`  P/F:           ${gimliPos.pf_ratio.toFixed(1)}x`);
    if (gimliPos.pe_ratio) console.log(`  P/E:           ${gimliPos.pe_ratio.toFixed(1)}x`);
    console.log(`  TradFi peer:   ${gimliPos.tradfi_peer}`);
    console.log(`  Peer range:    ${gimliPos.peer_pe_range}`);

    const valColor = {
      cheap: "✅",
      fair: "◯",
      expensive: "⚠️ ",
      unknown: "? ",
    }[gimliPos.valuation as string] || "? ";
    console.log(`  Valuation:     ${valColor} ${gimliPos.valuation?.toUpperCase()}`);

    if (gimliPos.upside_to_peer_pct !== null) {
      const sign = gimliPos.upside_to_peer_pct >= 0 ? "+" : "";
      console.log(`  Upside to peer: ${sign}${gimliPos.upside_to_peer_pct.toFixed(0)}% to peer mid`);
    }
    console.log("");

    // Fee switch state
    const fs = gimliPos.fee_switch || {};
    console.log("  ─── FEE SWITCH ───");
    const stateLabel = fs.state === "live_full" ? "🟢 LIVE (full capture)" :
      fs.state === "live_partial" ? "🟡 LIVE (partial)" :
      fs.state === "live_buyback" ? "🟡 LIVE (buyback)" :
      fs.state === "not_activated" ? "🔴 NOT ACTIVATED" :
      "⚪ UNKNOWN";
    console.log(`  State:         ${stateLabel}`);
    if (typeof fs.holder_pct === "number") {
      console.log(`  Holder %:      ${fs.holder_pct}% of fees flow to token holders`);
    }
    if (fs.note) console.log(`  Note:          ${fs.note}`);
    console.log("");
  }

  // Active governance proposals for this protocol
  if (proposals.length > 0) {
    console.log("  ─── ACTIVE GOVERNANCE ───");
    for (const p of proposals.slice(0, 5)) {
      const impactIcon = (p.ai_impact_score ?? 0) >= 7 ? "🔴" : (p.ai_impact_score ?? 0) >= 5 ? "🟡" : "⚪";
      console.log(`  ${impactIcon} [${(p.ai_impact_score ?? "?").toString().padStart(2)}/10] ${p.title}`);
      if (p.ai_summary) {
        const wrap = p.ai_summary.match(/.{1,72}(\s|$)/g) || [p.ai_summary];
        for (const line of wrap.slice(0, 3)) console.log(`       ${line.trim()}`);
      }
      if (p.voting_ends) {
        const days = Math.max(0, Math.ceil((new Date(p.voting_ends).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        console.log(`       Closes in ${days}d · ${p.current_result?.for?.toFixed(0) ?? "?"}% for, ${p.current_result?.against?.toFixed(0) ?? "?"}% against`);
      }
      console.log("");
    }
  }

  // Recent news
  if (newsItems.length > 0) {
    console.log("  ─── RECENT NEWS (Aragorn) ───");
    for (const n of newsItems) {
      const score = n.thesis_score ?? "?";
      console.log(`  [${score.toString().padStart(2)}/10] ${n.source}: ${n.title}`);
      if (n.thesis_reason) console.log(`         → ${n.thesis_reason}`);
    }
    console.log("");
  }

  console.log(`  Data sources: ori.json · gimli.json · governance.json · intelligence.json`);
  console.log("");
}

main();
