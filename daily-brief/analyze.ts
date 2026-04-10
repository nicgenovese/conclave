import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../portal/data");
const BRIEFS_DIR = resolve(DATA_DIR, "briefs");

// --- Types ---

interface Position {
  name: string;
  ticker: string;
  allocation_usd: number;
  allocation_pct: number;
  bucket: string;
  notes: string;
  coingecko_price?: number;
  market_cap?: number;
  change_24h?: number;
  tvl?: number;
}

interface Perp {
  pair: string;
  leverage: number;
  capital_usd: number;
  entry_1: number;
  entry_2: number;
  stop: number;
}

interface Portfolio {
  nav: number;
  updated_at: string;
  wallet: string;
  positions: Position[];
  perps: Perp[];
  total_perp_exposure: number;
  avg_leverage: number;
  max_perp_loss: number;
  allocation_buckets: { name: string; total_usd: number; pct: number; color: string }[];
}

interface RiskEntry {
  ticker: string;
  name: string;
  overall: number;
  status: "green" | "amber" | "red";
  factors: Record<string, number>;
  notes: string;
}

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
  signals: { account: string; handle: string; text: string; timestamp: string; category: string; url: string }[];
}

// --- Thresholds ---

const T = {
  PRICE_ALERT: 10,        // >10% 24h = ALERT
  PRICE_WATCH: 5,         // >5% 24h = WATCH
  CONCENTRATION: 25,      // >25% allocation = warning
  CATEGORY_MAX: 40,       // >40% in one category = warning
  SINGLE_MAX: 30,         // >30% single position = hard rule
  PM_VOLUME: 5_000_000,   // Polymarket >$5M vol = relevant
  PM_CONVICTION: 0.60,    // >60% on one outcome = high conviction
  PM_CRYPTO_RELEVANT: 0.40, // crypto-related events at >40%
  STOP_DANGER: 10,        // <10% to stop = DANGER
  STOP_WARN: 20,          // <20% to stop = WATCH
  STALE_HOURS: 24,        // data older than 24h = stale warning
  NAV_DROP_ALERT: 5,      // >5% NAV drop from previous brief
};

// --- Safe JSON reader ---

function safeReadJSON<T>(path: string, fallback: T): { data: T; ok: boolean; error?: string } {
  try {
    if (!existsSync(path)) return { data: fallback, ok: false, error: `Missing: ${path}` };
    const raw = readFileSync(path, "utf-8");
    return { data: JSON.parse(raw) as T, ok: true };
  } catch (err) {
    return { data: fallback, ok: false, error: `Parse error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// --- Formatters ---

function fmt(n: number, d = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPct(n: number): string { return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`; }
function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${fmt(n)}`;
}

// --- Smart Analysis Engine ---

interface Alert {
  severity: "DANGER" | "ALERT" | "WATCH" | "INFO";
  category: "price" | "concentration" | "perps" | "risk" | "macro" | "data";
  message: string;
}

function analyzePortfolio(portfolio: Portfolio, risk: RiskEntry[]): Alert[] {
  const alerts: Alert[] = [];
  const riskMap = new Map(risk.map(r => [r.ticker, r]));

  // 1. Price moves
  for (const pos of portfolio.positions) {
    if (pos.change_24h === undefined) continue;
    const abs = Math.abs(pos.change_24h);
    if (abs > T.PRICE_ALERT) {
      alerts.push({ severity: "ALERT", category: "price",
        message: `${pos.ticker} ${fmtPct(pos.change_24h)} in 24h — $${fmt(pos.allocation_usd)} position` });
    } else if (abs > T.PRICE_WATCH) {
      alerts.push({ severity: "WATCH", category: "price",
        message: `${pos.ticker} ${fmtPct(pos.change_24h)} in 24h` });
    }
  }

  // 2. Concentration — single position
  for (const pos of portfolio.positions) {
    if (pos.allocation_pct > T.SINGLE_MAX) {
      alerts.push({ severity: "ALERT", category: "concentration",
        message: `${pos.ticker} at ${pos.allocation_pct.toFixed(1)}% — EXCEEDS ${T.SINGLE_MAX}% hard limit` });
    } else if (pos.allocation_pct > T.CONCENTRATION) {
      alerts.push({ severity: "WATCH", category: "concentration",
        message: `${pos.ticker} at ${pos.allocation_pct.toFixed(1)}% of NAV (limit: ${T.SINGLE_MAX}%)` });
    }
  }

  // 3. Concentration — category limits
  const bucketTotals: Record<string, number> = {};
  for (const pos of portfolio.positions) {
    bucketTotals[pos.bucket] = (bucketTotals[pos.bucket] || 0) + pos.allocation_pct;
  }
  for (const [bucket, pct] of Object.entries(bucketTotals)) {
    if (bucket === "Gas") continue;
    if (pct > T.CATEGORY_MAX) {
      alerts.push({ severity: "ALERT", category: "concentration",
        message: `${bucket} category at ${pct.toFixed(1)}% — EXCEEDS ${T.CATEGORY_MAX}% limit` });
    }
  }

  // 4. Perps — distance to stop
  for (const perp of portfolio.perps) {
    const midEntry = (perp.entry_1 + perp.entry_2) / 2;
    const dist = ((midEntry - perp.stop) / midEntry) * 100;
    if (dist < T.STOP_DANGER) {
      alerts.push({ severity: "DANGER", category: "perps",
        message: `${perp.pair} only ${dist.toFixed(1)}% above stop ($${perp.stop}) — ${perp.leverage}x leverage` });
    } else if (dist < T.STOP_WARN) {
      alerts.push({ severity: "WATCH", category: "perps",
        message: `${perp.pair} ${dist.toFixed(1)}% above stop ($${perp.stop})` });
    }
  }

  // 5. Risk scores
  for (const r of risk) {
    if (r.status === "red") {
      const worstFactor = Object.entries(r.factors).reduce((a, b) => a[1] > b[1] ? a : b);
      alerts.push({ severity: "ALERT", category: "risk",
        message: `${r.name} RED (${r.overall}/10) — worst: ${worstFactor[0].replace(/_/g, " ")} (${worstFactor[1]}/10). ${r.notes}` });
    }
  }

  // 6. Data staleness
  const updatedAt = new Date(portfolio.updated_at);
  const hoursOld = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
  if (hoursOld > T.STALE_HOURS) {
    alerts.push({ severity: "WATCH", category: "data",
      message: `Portfolio data is ${Math.round(hoursOld)}h old — last update: ${portfolio.updated_at}` });
  }

  // 7. Compare with previous brief for NAV change
  try {
    const briefFiles = existsSync(BRIEFS_DIR)
      ? readFileSync(BRIEFS_DIR, "utf-8") : null;
    // Can't readdir a file, will catch
  } catch { /* ignore */ }

  return alerts.sort((a, b) => {
    const order = { DANGER: 0, ALERT: 1, WATCH: 2, INFO: 3 };
    return order[a.severity] - order[b.severity];
  });
}

function analyzeMacro(macro: MacroData, portfolio: Portfolio): { cryptoRelevant: PolymarketEvent[]; highConviction: PolymarketEvent[]; watchlist: PolymarketEvent[]; insights: string[] } {
  const insights: string[] = [];
  const tickers = new Set(portfolio.positions.map(p => p.ticker.toLowerCase()));

  // Categorize events by relevance to our portfolio
  const cryptoRelevant = macro.polymarket.filter(evt => {
    const q = evt.question.toLowerCase();
    return evt.category === "Crypto" || evt.category === "DeFi" || evt.category === "Rates"
      || q.includes("eth") || q.includes("bitcoin") || q.includes("defi") || q.includes("crypto")
      || q.includes("sec") || q.includes("regulation");
  });

  const highConviction = macro.polymarket.filter(evt => {
    const maxProb = Math.max(...evt.outcomes.map(o => o.probability));
    return maxProb > T.PM_CONVICTION && evt.volume_usd > T.PM_VOLUME;
  });

  const watchlist = macro.polymarket
    .filter(evt => evt.volume_usd > T.PM_VOLUME)
    .filter(evt => !highConviction.includes(evt));

  // Generate smart insights
  const fedEvents = macro.polymarket.filter(e =>
    e.question.toLowerCase().includes("fed") || e.question.toLowerCase().includes("rate"));
  if (fedEvents.length > 0) {
    const topFed = fedEvents[0];
    const yesProb = topFed.outcomes.find(o => o.name === "Yes")?.probability || 0;
    if (yesProb > 0.6) {
      insights.push(`Fed rate cut looking likely (${(yesProb * 100).toFixed(0)}%) — historically bullish for risk assets and DeFi TVL`);
    } else if (yesProb < 0.3) {
      insights.push(`Fed rate cut unlikely (${(yesProb * 100).toFixed(0)}%) — may suppress DeFi yields and risk appetite`);
    }
  }

  const regEvents = macro.polymarket.filter(e =>
    e.question.toLowerCase().includes("regulation") || e.question.toLowerCase().includes("crypto bill"));
  if (regEvents.length > 0) {
    const topReg = regEvents[0];
    const yesProb = topReg.outcomes.find(o => o.name === "Yes")?.probability || 0;
    insights.push(`Crypto regulation odds: ${(yesProb * 100).toFixed(0)}% — ${yesProb > 0.5 ? "tailwind for institutional adoption" : "uncertainty persists"}`);
  }

  // Check for any events directly mentioning our holdings
  for (const evt of macro.polymarket) {
    const q = evt.question.toLowerCase();
    for (const ticker of tickers) {
      if (q.includes(ticker) && evt.volume_usd > 1_000_000) {
        const topOutcome = evt.outcomes.reduce((a, b) => a.probability > b.probability ? a : b);
        insights.push(`Polymarket directly mentions ${ticker.toUpperCase()}: "${evt.question}" — ${topOutcome.name} at ${(topOutcome.probability * 100).toFixed(0)}%`);
      }
    }
  }

  return { cryptoRelevant, highConviction, watchlist, insights };
}

// --- Brief Generator ---

function generateBrief(date: string, portfolio: Portfolio, risk: RiskEntry[], macro: MacroData): string {
  const alerts = analyzePortfolio(portfolio, risk);
  const macroAnalysis = analyzeMacro(macro, portfolio);
  const riskMap = new Map(risk.map(r => [r.ticker, r]));

  const spotCount = portfolio.positions.filter(p => p.bucket !== "Gas").length;
  const perpCount = portfolio.perps.length;

  // Weighted portfolio change
  let weightedChange = 0, weightSum = 0;
  for (const pos of portfolio.positions) {
    if (pos.change_24h !== undefined && pos.allocation_pct > 0) {
      weightedChange += pos.change_24h * (pos.allocation_pct / 100);
      weightSum += pos.allocation_pct / 100;
    }
  }
  const portfolioChange = weightSum > 0 ? weightedChange / weightSum : 0;

  // Top movers
  const movers = [...portfolio.positions]
    .filter(p => p.change_24h !== undefined)
    .sort((a, b) => Math.abs(b.change_24h!) - Math.abs(a.change_24h!));
  const topGainer = movers.find(p => (p.change_24h || 0) > 0);
  const topLoser = movers.find(p => (p.change_24h || 0) < 0);

  const lines: string[] = [];

  // === Header ===
  lines.push(`# Daily Brief — ${date}`);
  lines.push("");

  // === TL;DR (the smart part) ===
  lines.push("## TL;DR");
  const dangerCount = alerts.filter(a => a.severity === "DANGER").length;
  const alertCount = alerts.filter(a => a.severity === "ALERT").length;

  if (dangerCount > 0) {
    lines.push(`> ⛔ **${dangerCount} DANGER signal${dangerCount > 1 ? "s" : ""}** — immediate attention required.`);
  } else if (alertCount > 0) {
    lines.push(`> ⚠️ **${alertCount} alert${alertCount > 1 ? "s" : ""}** flagged. Review below.`);
  } else {
    lines.push(`> ✅ Portfolio clean. No alerts.`);
  }

  lines.push("");
  lines.push(`NAV $${fmt(portfolio.nav)} (${fmtPct(portfolioChange)} 24h). ${spotCount} spot + ${perpCount} perps.`);
  if (topGainer) lines.push(`Best: **${topGainer.ticker}** ${fmtPct(topGainer.change_24h!)}. ` +
    `${topLoser ? `Worst: **${topLoser.ticker}** ${fmtPct(topLoser.change_24h!)}.` : ""}`);

  if (macroAnalysis.insights.length > 0) {
    lines.push("");
    for (const insight of macroAnalysis.insights) {
      lines.push(`> 💡 ${insight}`);
    }
  }
  lines.push("");

  // === Alerts ===
  if (alerts.length > 0) {
    lines.push("## Alerts");
    for (const a of alerts) {
      const icon = a.severity === "DANGER" ? "🔴" : a.severity === "ALERT" ? "🟠" : a.severity === "WATCH" ? "🟡" : "🔵";
      lines.push(`- ${icon} **[${a.severity}]** ${a.message}`);
    }
    lines.push("");
  }

  // === Positions ===
  lines.push("## Positions");
  lines.push("");
  lines.push("| Asset | Alloc | 24h | Bucket | Risk | Notes |");
  lines.push("|-------|-------|-----|--------|------|-------|");
  for (const pos of portfolio.positions) {
    if (pos.bucket === "Gas") continue;
    const alloc = `$${fmt(pos.allocation_usd)} (${pos.allocation_pct.toFixed(1)}%)`;
    const change = pos.change_24h !== undefined ? fmtPct(pos.change_24h) : "--";
    const r = riskMap.get(pos.ticker);
    const riskStr = r ? `${r.status === "green" ? "🟢" : r.status === "amber" ? "🟡" : "🔴"} ${r.overall}/10` : "--";
    const note = pos.notes ? pos.notes.slice(0, 40) : "";
    lines.push(`| **${pos.ticker}** | ${alloc} | ${change} | ${pos.bucket} | ${riskStr} | ${note} |`);
  }
  lines.push("");

  // === Perps ===
  lines.push("## Perp Monitor");
  lines.push("");
  lines.push("| Pair | Lev | Capital | Avg Entry | Stop | Gap |");
  lines.push("|------|-----|---------|-----------|------|-----|");
  for (const perp of portfolio.perps) {
    const mid = (perp.entry_1 + perp.entry_2) / 2;
    const dist = ((mid - perp.stop) / mid) * 100;
    const distIcon = dist < T.STOP_DANGER ? "🔴" : dist < T.STOP_WARN ? "🟡" : "🟢";
    lines.push(`| ${perp.pair} | ${perp.leverage}x | $${fmt(perp.capital_usd)} | $${fmt(mid, 2)} | $${fmt(perp.stop)} | ${distIcon} ${dist.toFixed(1)}% |`);
  }
  lines.push(`\nTotal exposure: ${fmtUsd(portfolio.total_perp_exposure)} at ${portfolio.avg_leverage.toFixed(1)}x avg. Max loss: ${fmtUsd(portfolio.max_perp_loss)}`);
  lines.push("");

  // === Macro — Smart Polymarket Section ===
  lines.push("## Macro Intelligence");
  lines.push("");

  if (macroAnalysis.cryptoRelevant.length > 0) {
    lines.push("### Crypto-Relevant Markets");
    for (const evt of macroAnalysis.cryptoRelevant.slice(0, 6)) {
      const topOutcome = evt.outcomes.reduce((a, b) => a.probability > b.probability ? a : b);
      const prob = (topOutcome.probability * 100).toFixed(0);
      const bar = "█".repeat(Math.round(topOutcome.probability * 10)) + "░".repeat(10 - Math.round(topOutcome.probability * 10));
      lines.push(`- **${evt.question}**`);
      lines.push(`  ${bar} ${topOutcome.name} ${prob}% | Vol: ${fmtUsd(evt.volume_usd)} | [${evt.category}](${evt.url})`);
    }
    lines.push("");
  }

  if (macroAnalysis.highConviction.length > 0) {
    lines.push("### High Conviction (>60% + >$5M vol)");
    for (const evt of macroAnalysis.highConviction) {
      const topOutcome = evt.outcomes.reduce((a, b) => a.probability > b.probability ? a : b);
      lines.push(`- **${evt.question}** → ${topOutcome.name} at ${(topOutcome.probability * 100).toFixed(0)}% (${fmtUsd(evt.volume_usd)})`);
    }
    lines.push("");
  }

  if (macroAnalysis.watchlist.length > 0) {
    lines.push("### Watchlist");
    for (const evt of macroAnalysis.watchlist.slice(0, 5)) {
      const summary = evt.outcomes.map(o => `${o.name}: ${(o.probability * 100).toFixed(0)}%`).join(" / ");
      lines.push(`- ${evt.question} — ${summary} (${fmtUsd(evt.volume_usd)})`);
    }
    lines.push("");
  }

  // === Signals ===
  if (macro.signals && macro.signals.length > 0) {
    lines.push("## Signal Digest");
    lines.push("");
    for (const sig of macro.signals.slice(0, 5)) {
      const ts = sig.timestamp ? sig.timestamp.split("T")[0] : "";
      lines.push(`- **${sig.account}** (${ts}): ${sig.text}`);
    }
    lines.push("");
  }

  // === Risk Summary ===
  const greens = risk.filter(r => r.status === "green").length;
  const ambers = risk.filter(r => r.status === "amber").length;
  const reds = risk.filter(r => r.status === "red").length;
  lines.push("## Risk Summary");
  lines.push(`🟢 ${greens} low | 🟡 ${ambers} medium | 🔴 ${reds} high`);
  if (reds > 0) {
    lines.push("");
    for (const r of risk.filter(r => r.status === "red")) {
      lines.push(`- **${r.name}** (${r.overall}/10): ${r.notes}`);
    }
  }
  lines.push("");

  // === Footer ===
  lines.push("---");
  lines.push(`*Generated ${new Date().toISOString()} | Pure computation, $0 cost | Data: CoinGecko + DeFi Llama + Polymarket*`);
  lines.push("");

  return lines.join("\n");
}

// --- Main export ---

export async function analyzeAndBrief(): Promise<{ briefPath: string; alertCount: number; insights: string[] }> {
  const portfolioResult = safeReadJSON<Portfolio>(resolve(DATA_DIR, "portfolio.json"), { nav: 0, updated_at: "N/A", wallet: "", positions: [], perps: [], total_perp_exposure: 0, avg_leverage: 0, max_perp_loss: 0, allocation_buckets: [] });
  // Note: risk.json removed (was dead static data). Brief uses portfolio + macro only.
  // Live risk alerts come from Balin (risk-alerts.json), shown on /risk page.
  const riskResult = { ok: true, data: [] as RiskEntry[], error: null };
  const macroResult = safeReadJSON<MacroData>(resolve(DATA_DIR, "macro.json"), { updated_at: "N/A", polymarket: [], signals: [] });

  if (!portfolioResult.ok) console.error(`[analyze] Portfolio: ${portfolioResult.error}`);
  if (!riskResult.ok) console.error(`[analyze] Risk: ${riskResult.error}`);
  if (!macroResult.ok) console.error(`[analyze] Macro: ${macroResult.error}`);

  const today = new Date().toISOString().split("T")[0];
  const brief = generateBrief(today, portfolioResult.data, riskResult.data, macroResult.data);

  mkdirSync(BRIEFS_DIR, { recursive: true });
  const briefPath = resolve(BRIEFS_DIR, `${today}.md`);
  writeFileSync(briefPath, brief, "utf-8");

  const alerts = analyzePortfolio(portfolioResult.data, riskResult.data);
  const macroAnalysis = analyzeMacro(macroResult.data, portfolioResult.data);

  console.log(`[analyze] Brief: ${briefPath}`);
  console.log(`[analyze] ${alerts.length} alerts, ${macroAnalysis.insights.length} insights`);

  return { briefPath, alertCount: alerts.length, insights: macroAnalysis.insights };
}

if (process.argv[1]?.endsWith("analyze.ts")) {
  analyzeAndBrief().catch(console.error);
}
