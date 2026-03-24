import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../portal/data");
const BRIEFS_DIR = resolve(DATA_DIR, "briefs");

// --- Types matching existing data files ---

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

const THRESHOLDS = {
  PRICE_CHANGE_ALERT: 10,    // >10% 24h change
  PRICE_CHANGE_WATCH: 5,     // >5% 24h change
  CONCENTRATION_WARN: 25,    // >25% allocation
  POLYMARKET_VOLUME: 5_000_000,  // >$5M volume
  POLYMARKET_CONVICTION: 0.60,   // >60% probability
  STOP_DISTANCE_WARN: 15,       // <15% distance to stop
};

// --- Helpers ---

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${fmt(n)}`;
}

function riskEmoji(status: string): string {
  if (status === "green") return "OK";
  if (status === "amber") return "WARN";
  if (status === "red") return "ALERT";
  return "?";
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

// --- Analysis ---

interface Alert {
  severity: "ALERT" | "WARN" | "INFO";
  message: string;
}

function computeAlerts(portfolio: Portfolio, risk: RiskEntry[]): Alert[] {
  const alerts: Alert[] = [];

  // Price move alerts
  for (const pos of portfolio.positions) {
    if (pos.change_24h !== undefined) {
      const absChange = Math.abs(pos.change_24h);
      if (absChange > THRESHOLDS.PRICE_CHANGE_ALERT) {
        alerts.push({
          severity: "ALERT",
          message: `${pos.ticker} moved ${fmtPct(pos.change_24h)} in 24h`,
        });
      } else if (absChange > THRESHOLDS.PRICE_CHANGE_WATCH) {
        alerts.push({
          severity: "WARN",
          message: `${pos.ticker} moved ${fmtPct(pos.change_24h)} in 24h`,
        });
      }
    }
  }

  // Concentration warnings
  for (const pos of portfolio.positions) {
    if (pos.allocation_pct > THRESHOLDS.CONCENTRATION_WARN) {
      alerts.push({
        severity: "WARN",
        message: `${pos.ticker} concentration at ${pos.allocation_pct.toFixed(1)}% (threshold: ${THRESHOLDS.CONCENTRATION_WARN}%)`,
      });
    }
  }

  // Perps near stop
  for (const perp of portfolio.perps) {
    const midEntry = (perp.entry_1 + perp.entry_2) / 2;
    const distToStop = ((midEntry - perp.stop) / midEntry) * 100;
    if (distToStop < THRESHOLDS.STOP_DISTANCE_WARN) {
      alerts.push({
        severity: "ALERT",
        message: `${perp.pair} only ${distToStop.toFixed(1)}% above stop ($${perp.stop})`,
      });
    }
  }

  // Red risk scores
  for (const r of risk) {
    if (r.status === "red") {
      alerts.push({
        severity: "ALERT",
        message: `${r.name} risk score RED (${r.overall}/10) -- ${r.notes}`,
      });
    }
  }

  return alerts;
}

function generateBrief(
  date: string,
  portfolio: Portfolio,
  risk: RiskEntry[],
  macro: MacroData,
): string {
  const alerts = computeAlerts(portfolio, risk);

  // Count spot vs perps
  const spotCount = portfolio.positions.filter((p) => p.bucket !== "Gas").length;
  const perpCount = portfolio.perps.length;

  // Compute overall 24h change (weighted)
  let weightedChange = 0;
  let weightSum = 0;
  for (const pos of portfolio.positions) {
    if (pos.change_24h !== undefined && pos.allocation_pct > 0) {
      weightedChange += pos.change_24h * (pos.allocation_pct / 100);
      weightSum += pos.allocation_pct / 100;
    }
  }
  const portfolioChange = weightSum > 0 ? weightedChange / weightSum : 0;

  // Build the risk lookup
  const riskMap = new Map<string, RiskEntry>();
  for (const r of risk) riskMap.set(r.ticker, r);

  // --- Assemble markdown ---

  const lines: string[] = [];

  lines.push(`# Daily Brief -- ${date}`);
  lines.push("");

  // Portfolio Snapshot
  lines.push("## Portfolio Snapshot");
  lines.push(`- **NAV**: $${fmt(portfolio.nav)}`);
  lines.push(`- **24h Change**: ${fmtPct(portfolioChange)} (weighted)`);
  lines.push(`- **Positions**: ${spotCount} spot, ${perpCount} perps`);
  lines.push(`- **Perp Exposure**: ${fmtUsd(portfolio.total_perp_exposure)} at ${portfolio.avg_leverage.toFixed(1)}x avg leverage`);
  lines.push(`- **Max Perp Loss**: ${fmtUsd(portfolio.max_perp_loss)}`);
  lines.push("");

  // Alerts
  lines.push("## Alerts");
  if (alerts.length === 0) {
    lines.push("No alerts. All clear.");
  } else {
    for (const a of alerts) {
      const prefix = a.severity === "ALERT" ? "[!]" : a.severity === "WARN" ? "[~]" : "[i]";
      lines.push(`- **${prefix}** ${a.message}`);
    }
  }
  lines.push("");

  // Position Summary
  lines.push("## Position Summary");
  lines.push("");
  lines.push("| Asset | Price | 24h | Weight | Bucket | Risk |");
  lines.push("|-------|-------|-----|--------|--------|------|");
  for (const pos of portfolio.positions) {
    const price = pos.coingecko_price ? `$${fmt(pos.coingecko_price, 2)}` : "--";
    const change = pos.change_24h !== undefined ? fmtPct(pos.change_24h) : "--";
    const weight = `${pos.allocation_pct.toFixed(1)}%`;
    const r = riskMap.get(pos.ticker);
    const riskStr = r ? `${riskEmoji(r.status)} (${r.overall})` : "--";
    lines.push(`| ${pos.ticker} | ${price} | ${change} | ${weight} | ${pos.bucket} | ${riskStr} |`);
  }
  lines.push("");

  // Macro Signals
  lines.push("## Macro Signals");
  lines.push("");

  // High conviction: >60% on any outcome AND >$5M volume
  const highConviction = macro.polymarket.filter((evt) => {
    const maxProb = Math.max(...evt.outcomes.map((o) => o.probability));
    return maxProb > THRESHOLDS.POLYMARKET_CONVICTION && evt.volume_usd > THRESHOLDS.POLYMARKET_VOLUME;
  });

  lines.push("### High Conviction (>60% + >$5M volume)");
  if (highConviction.length === 0) {
    lines.push("No high-conviction events this cycle.");
  } else {
    for (const evt of highConviction) {
      const topOutcome = evt.outcomes.reduce((a, b) => (a.probability > b.probability ? a : b));
      lines.push(
        `- **${evt.question}** -- ${topOutcome.name} at ${(topOutcome.probability * 100).toFixed(0)}% | Vol: ${fmtUsd(evt.volume_usd)} | ${evt.category}`
      );
    }
  }
  lines.push("");

  // Watchlist: high volume regardless of conviction
  const watchlist = macro.polymarket
    .filter((evt) => evt.volume_usd > THRESHOLDS.POLYMARKET_VOLUME)
    .filter((evt) => !highConviction.includes(evt));

  lines.push("### Watchlist (>$5M volume)");
  if (watchlist.length === 0) {
    lines.push("No additional high-volume events.");
  } else {
    for (const evt of watchlist) {
      const summary = evt.outcomes.map((o) => `${o.name}: ${(o.probability * 100).toFixed(0)}%`).join(" / ");
      lines.push(`- **${evt.question}** -- ${summary} | Vol: ${fmtUsd(evt.volume_usd)} | ${evt.category}`);
    }
  }
  lines.push("");

  // Risk Flags
  lines.push("## Risk Flags");
  lines.push("");
  const flagged = risk.filter((r) => r.status === "red" || r.status === "amber");
  if (flagged.length === 0) {
    lines.push("All positions green. No flags.");
  } else {
    // Red first, then amber
    const sorted = [...flagged].sort((a, b) => {
      if (a.status === "red" && b.status !== "red") return -1;
      if (a.status !== "red" && b.status === "red") return 1;
      return b.overall - a.overall;
    });
    for (const r of sorted) {
      const status = r.status.toUpperCase();
      const topFactor = Object.entries(r.factors).reduce((a, b) => (a[1] > b[1] ? a : b));
      lines.push(
        `- **[${status}]** ${r.name} (${r.overall}/10) -- highest factor: ${topFactor[0]} (${topFactor[1]}/10). ${r.notes}`
      );
    }
  }
  lines.push("");

  // Perp Monitor
  lines.push("## Perp Monitor");
  lines.push("");
  lines.push("| Pair | Leverage | Capital | Entry Avg | Stop | Distance to Stop |");
  lines.push("|------|----------|---------|-----------|------|------------------|");
  for (const perp of portfolio.perps) {
    const midEntry = (perp.entry_1 + perp.entry_2) / 2;
    const distToStop = ((midEntry - perp.stop) / midEntry) * 100;
    const distLabel = distToStop < THRESHOLDS.STOP_DISTANCE_WARN ? `${distToStop.toFixed(1)}% [!]` : `${distToStop.toFixed(1)}%`;
    lines.push(
      `| ${perp.pair} | ${perp.leverage}x | $${fmt(perp.capital_usd)} | $${fmt(midEntry, 2)} | $${fmt(perp.stop, 2)} | ${distLabel} |`
    );
  }
  lines.push("");

  // Signals digest
  if (macro.signals && macro.signals.length > 0) {
    lines.push("## Signal Digest");
    lines.push("");
    for (const sig of macro.signals.slice(0, 5)) {
      const ts = sig.timestamp ? sig.timestamp.split("T")[0] : "";
      lines.push(`- **${sig.account}** (${ts}): ${sig.text}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`*Generated at ${new Date().toISOString()} -- pure computation, no LLM calls, $0 cost.*`);
  lines.push("");

  return lines.join("\n");
}

// --- Main export ---

export async function analyzeAndBrief(): Promise<{ briefPath: string; alertCount: number }> {
  // Read data files
  const portfolio: Portfolio = JSON.parse(readFileSync(resolve(DATA_DIR, "portfolio.json"), "utf-8"));
  const risk: RiskEntry[] = JSON.parse(readFileSync(resolve(DATA_DIR, "risk.json"), "utf-8"));
  const macro: MacroData = JSON.parse(readFileSync(resolve(DATA_DIR, "macro.json"), "utf-8"));

  const today = new Date().toISOString().split("T")[0];

  // Generate brief
  const brief = generateBrief(today, portfolio, risk, macro);

  // Ensure briefs directory exists
  mkdirSync(BRIEFS_DIR, { recursive: true });

  // Write brief
  const briefPath = resolve(BRIEFS_DIR, `${today}.md`);
  writeFileSync(briefPath, brief, "utf-8");

  const alerts = computeAlerts(portfolio, risk);
  console.log(`[analyze] Brief written to ${briefPath}`);
  console.log(`[analyze] ${alerts.length} alert(s) found`);

  return { briefPath, alertCount: alerts.length };
}

// Allow direct execution
if (process.argv[1]?.endsWith("analyze.ts")) {
  analyzeAndBrief().catch(console.error);
}
