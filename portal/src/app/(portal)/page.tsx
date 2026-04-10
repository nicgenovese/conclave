import {
  getPortfolio,
  getHeadlines,
  getGovernance,
  getRiskAlerts,
  getCommodities,
  getMacroDataFull,
  getIntelligence,
} from "@/lib/data";
import { formatUSD } from "@/lib/utils";
import PerpsTable from "@/components/dashboard/perps-table";
import { ErrorBoundary } from "@/components/error-boundary";
import type {
  PolymarketEvent,
  RiskAlert,
  GovernanceAlert,
  IntelligenceItem,
} from "@/lib/types";
import Link from "next/link";

function isStale(dateStr: string): boolean {
  if (!dateStr || dateStr === "N/A") return true;
  try {
    return Date.now() - new Date(dateStr).getTime() > 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function PctChange({ value }: { value: number }) {
  const color =
    value > 0 ? "text-moria-pos" : value < 0 ? "text-moria-neg" : "text-moria-dim";
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "";
  return (
    <span className={`font-mono text-xs tabular-nums ${color}`}>
      {arrow}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function Home() {
  const portfolio = getPortfolio();
  const headlinesData = getHeadlines();
  const governance = getGovernance();
  const riskAlerts = getRiskAlerts();
  const stale = isStale(portfolio.updated_at);

  // Group polymarket
  const polymarketByCategory: Record<string, PolymarketEvent[]> = {};
  if (headlinesData?.polymarket) {
    for (const event of headlinesData.polymarket) {
      const cat = event.category || "Other";
      if (!polymarketByCategory[cat]) polymarketByCategory[cat] = [];
      polymarketByCategory[cat].push(event);
    }
  }

  const topPositions = portfolio.positions.slice(0, 8);
  const hasPerps = portfolio.perps.length > 0;
  const hasCriticalAlerts =
    (riskAlerts?.summary?.critical ?? 0) + (riskAlerts?.summary?.warning ?? 0) > 0;
  const topGovernance = (governance?.active || [])
    .filter((a) => a.relevance === "high" || a.relevance === "medium")
    .slice(0, 4);

  // Regime Snapshot data
  const commodities = getCommodities();
  const macroFull = getMacroDataFull();
  const intelligence = getIntelligence();

  const hasRegimeData = macroFull || commodities || intelligence;
  const topIntelItems = (intelligence?.top_stories || []).slice(0, 6);

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* ── HEADER BAR ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
          <div>
            <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
              Conclave
            </p>
            <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-none">
              Morning Brief
            </h1>
          </div>
          <div className="sm:text-right">
            <p className="text-[12px] sm:text-[13px] text-moria-dim">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            {stale && (
              <p className="text-copper text-[11px] font-mono mt-0.5 flex items-center sm:justify-end gap-1.5">
                <span className="h-1.5 w-1.5 bg-copper rounded-full inline-block" />
                Data stale
              </p>
            )}
          </div>
        </div>

        {/* ── RISK ALERTS (only if any exist) ───── */}
        {hasCriticalAlerts && riskAlerts && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-moria-black">
                  Risk Alerts
                </h2>
                <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                  Balin
                </span>
                {riskAlerts.summary.critical > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-moria-neg text-white text-[10px] font-mono font-medium rounded">
                    <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                    {riskAlerts.summary.critical} CRITICAL
                  </span>
                )}
                {riskAlerts.summary.warning > 0 && (
                  <span className="px-2 py-0.5 bg-copper/10 text-copper text-[10px] font-mono font-medium rounded">
                    {riskAlerts.summary.warning} WARNING
                  </span>
                )}
              </div>
              <Link
                href="/risk"
                className="text-copper text-[11px] font-mono hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="divide-y divide-moria-rule/30">
              {riskAlerts.alerts
                .filter((a) => a.severity !== "info")
                .slice(0, 5)
                .map((alert: RiskAlert) => (
                  <div key={alert.id} className="px-5 py-3 flex items-start gap-3">
                    <div
                      className={`h-2 w-2 mt-1.5 rounded-full flex-shrink-0 ${
                        alert.severity === "critical"
                          ? "bg-moria-neg"
                          : "bg-copper"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-[13px] font-medium text-moria-black">
                          {alert.title}
                        </p>
                        {alert.position && (
                          <span className="font-mono text-[10px] text-moria-light">
                            {alert.position}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-moria-dim mt-0.5">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── KEY METRICS ROW ──────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div className="card p-3 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
              NAV
            </p>
            <p className="font-mono text-[20px] sm:text-[28px] font-normal tabular-nums text-moria-black leading-tight">
              {formatUSD(portfolio.nav)}
            </p>
          </div>
          <div className="card p-3 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
              Positions
            </p>
            <p className="font-mono text-[20px] sm:text-[28px] font-normal tabular-nums text-moria-black leading-tight">
              {portfolio.positions.length}
            </p>
            <p className="text-moria-dim text-[10px] sm:text-xs mt-0.5 sm:mt-1">
              {portfolio.allocation_buckets.length} buckets
            </p>
          </div>
          <div className="card p-3 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
              Perps
            </p>
            <p className="font-mono text-[20px] sm:text-[28px] font-normal tabular-nums text-moria-black leading-tight">
              {formatUSD(portfolio.total_perp_exposure)}
            </p>
            <p className="text-moria-dim text-[10px] sm:text-xs mt-0.5 sm:mt-1">
              {portfolio.avg_leverage.toFixed(1)}x avg
            </p>
          </div>
          <div className="card p-3 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
              Max Loss
            </p>
            <p className="font-mono text-[20px] sm:text-[28px] font-normal tabular-nums text-moria-neg leading-tight">
              {formatUSD(portfolio.max_perp_loss)}
            </p>
          </div>
        </div>

        {/* ── REGIME SNAPSHOT (3-card row) ───────── */}
        {hasRegimeData && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-moria-black">Regime</h2>
              <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                Elrond · Gimli · Durin
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Macro Regime — Elrond */}
              <Link href="/macro-data" className="block">
                <div className="card p-4 hover:shadow-card-hover transition-shadow h-full">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-copper text-[10px] font-mono uppercase tracking-widest">
                      Macro
                    </p>
                    {macroFull && (
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider ${
                          macroFull.regime === "risk_on"
                            ? "bg-moria-pos/10 text-moria-pos"
                            : macroFull.regime === "risk_off"
                            ? "bg-moria-neg/10 text-moria-neg"
                            : "bg-moria-faint text-moria-dim"
                        }`}
                      >
                        {macroFull.regime.toUpperCase().replace("_", " ")}
                      </span>
                    )}
                  </div>
                  {macroFull ? (
                    <>
                      <p className="text-[12px] text-moria-dim leading-snug mb-2 line-clamp-2">
                        {macroFull.regime_summary}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        {macroFull.fed.funds_rate.value !== null && (
                          <div>
                            <span className="text-moria-light">Fed</span>{" "}
                            <span className="text-moria-black">
                              {macroFull.fed.funds_rate.value.toFixed(2)}%
                            </span>
                          </div>
                        )}
                        {macroFull.yields.y10.value !== null && (
                          <div>
                            <span className="text-moria-light">10Y</span>{" "}
                            <span className="text-moria-black">
                              {macroFull.yields.y10.value.toFixed(2)}%
                            </span>
                          </div>
                        )}
                        {macroFull.inflation.cpi_yoy_pct.value !== null && (
                          <div>
                            <span className="text-moria-light">CPI</span>{" "}
                            <span className="text-moria-black">
                              {macroFull.inflation.cpi_yoy_pct.value.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {macroFull.employment.unrate.value !== null && (
                          <div>
                            <span className="text-moria-light">UR</span>{" "}
                            <span className="text-moria-black">
                              {macroFull.employment.unrate.value.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[12px] text-moria-light">
                      Add FRED_API_KEY to enable
                    </p>
                  )}
                </div>
              </Link>

              {/* Commodity Regime — Gimli */}
              <Link href="/commodities" className="block">
                <div className="card p-4 hover:shadow-card-hover transition-shadow h-full">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-copper text-[10px] font-mono uppercase tracking-widest">
                      Commodities
                    </p>
                    {commodities && commodities.signals.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider bg-copper/10 text-copper">
                        {commodities.signals.length} SIGNAL{commodities.signals.length !== 1 ? "S" : ""}
                      </span>
                    )}
                  </div>
                  {commodities ? (
                    <>
                      {commodities.signals.length > 0 && (
                        <p className="text-[12px] text-moria-dim leading-snug mb-2 line-clamp-2">
                          {commodities.signals[0].message}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        {commodities.tokenized.paxg_usd.value !== null && (
                          <div>
                            <span className="text-moria-light">Gold</span>{" "}
                            <span className="text-moria-black">
                              ${commodities.tokenized.paxg_usd.value.toFixed(0)}
                            </span>
                          </div>
                        )}
                        {commodities.spot.copper_usd_lb.value !== null && (
                          <div>
                            <span className="text-moria-light">Cu</span>{" "}
                            <span className="text-moria-black">
                              ${commodities.spot.copper_usd_lb.value.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {commodities.spot.wti_usd_bbl.value !== null && (
                          <div>
                            <span className="text-moria-light">WTI</span>{" "}
                            <span className="text-moria-black">
                              ${commodities.spot.wti_usd_bbl.value.toFixed(0)}
                            </span>
                          </div>
                        )}
                        {commodities.mining_equities.freeport_fcx.value !== null && (
                          <div>
                            <span className="text-moria-light">FCX</span>{" "}
                            <span className="text-moria-black">
                              ${commodities.mining_equities.freeport_fcx.value.toFixed(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[12px] text-moria-light">
                      Run Gimli to enable
                    </p>
                  )}
                </div>
              </Link>

              {/* Intelligence Pulse — Aragorn */}
              <Link href="/intelligence" className="block">
                <div className="card p-4 hover:shadow-card-hover transition-shadow h-full">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-copper text-[10px] font-mono uppercase tracking-widest">
                      Intelligence
                    </p>
                    {intelligence && intelligence.summary.by_priority.high > 0 && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider bg-copper/10 text-copper">
                        {intelligence.summary.by_priority.high} HIGH
                      </span>
                    )}
                  </div>
                  {intelligence ? (
                    <>
                      <p className="text-[12px] text-moria-dim leading-snug mb-2">
                        {intelligence.summary.total_items} items ·{" "}
                        {intelligence.summary.sources_succeeded} sources
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-moria-light">DeFi</span>{" "}
                          <span className="text-moria-black">
                            {intelligence.summary.by_category.defi}
                          </span>
                        </div>
                        <div>
                          <span className="text-moria-light">Regs</span>{" "}
                          <span className="text-moria-black">
                            {intelligence.summary.by_category.regulatory}
                          </span>
                        </div>
                        <div>
                          <span className="text-moria-light">Cmdty</span>{" "}
                          <span className="text-moria-black">
                            {intelligence.summary.by_category.commodity}
                          </span>
                        </div>
                        <div>
                          <span className="text-moria-light">Cos</span>{" "}
                          <span className="text-moria-black">
                            {intelligence.summary.by_category.company}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-[12px] text-moria-light">Run Aragorn to enable</p>
                  )}
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* ── TWO COLUMN: POSITIONS + HEADLINES ──── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* LEFT: Positions (3 cols) */}
          <div className="xl:col-span-3">
            <div className="card overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-moria-black">
                  Positions
                </h2>
                <Link
                  href="/risk"
                  className="text-copper text-[11px] font-mono hover:underline"
                >
                  View all →
                </Link>
              </div>
              <div className="overflow-x-auto -mx-0">
                <table className="w-full text-[12px] sm:text-[13px]">
                  <thead>
                    <tr className="border-t-2 border-copper bg-[#F5F4F2]">
                      <th className="text-left px-3 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                        Asset
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                        Value
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim hidden sm:table-cell">
                        Alloc
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim hidden sm:table-cell">
                        P&L
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim hidden lg:table-cell">
                        Bucket
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPositions.map((pos) => (
                      <tr
                        key={pos.ticker}
                        className="border-b border-moria-rule/30 hover:bg-[#F8F7F5] transition-colors"
                      >
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-moria-black">
                              {pos.ticker}
                            </span>
                            {/* Show P&L inline on mobile */}
                            <span className="sm:hidden">
                              <PctChange value={pos.pnl_pct ?? 0} />
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right font-mono tabular-nums text-moria-black">
                          {formatUSD(pos.allocation_usd)}
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right hidden sm:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1 bg-moria-faint rounded-full overflow-hidden">
                              <div
                                className="h-full bg-copper rounded-full"
                                style={{
                                  width: `${Math.min(pos.allocation_pct, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs tabular-nums text-moria-dim">
                              {pos.allocation_pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right hidden sm:table-cell">
                          <PctChange value={pos.pnl_pct ?? 0} />
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right hidden lg:table-cell">
                          <span className="text-[11px] text-moria-light">
                            {pos.bucket}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT: Headlines (2 cols) */}
          <div className="xl:col-span-2">
            <div className="card p-5">
              <h2 className="text-[15px] font-semibold text-moria-black mb-4">
                Headlines
              </h2>
              {!headlinesData || headlinesData.headlines.length === 0 ? (
                <p className="text-moria-light text-sm">
                  Run Durin to generate headlines.
                </p>
              ) : (
                <div className="space-y-4">
                  {headlinesData.headlines.slice(0, 6).map((h, i) => (
                    <div
                      key={i}
                      className={
                        i < headlinesData.headlines.length - 1
                          ? "pb-4 border-b border-moria-rule/20"
                          : ""
                      }
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-copper text-[9px] font-mono font-medium uppercase tracking-widest">
                          {h.category}
                        </span>
                        <span className="text-moria-rule text-[9px]">·</span>
                        <span className="font-mono text-[9px] text-moria-light">
                          {h.source} {formatDate(h.date)}
                        </span>
                      </div>
                      <p className="font-serif text-[14px] leading-snug text-moria-black">
                        {h.url ? (
                          <a
                            href={h.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-copper transition-colors"
                          >
                            {h.title}
                          </a>
                        ) : (
                          h.title
                        )}
                      </p>
                      {h.relevance && (
                        <p className="text-[11px] italic text-moria-dim mt-1">
                          {h.relevance}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── GOVERNANCE (Thorin) ────────────────── */}
        {topGovernance.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-moria-black">
                  Governance
                </h2>
                <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                  Thorin
                </span>
                {governance && governance.summary.high_relevance > 0 && (
                  <span className="px-2 py-0.5 bg-copper/10 text-copper text-[10px] font-mono font-medium rounded">
                    {governance.summary.high_relevance} HIGH
                  </span>
                )}
              </div>
              <Link
                href="/governance"
                className="text-copper text-[11px] font-mono hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topGovernance.map((alert: GovernanceAlert) => (
                <div key={alert.id} className="card p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono font-medium text-copper text-[11px]">
                      {alert.protocol}
                    </span>
                    <span className="text-moria-rule text-[10px]">·</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-wider ${
                        alert.relevance === "high"
                          ? "bg-copper text-white"
                          : "bg-moria-faint text-moria-dim"
                      }`}
                    >
                      {alert.relevance.toUpperCase()}
                    </span>
                  </div>
                  <a
                    href={alert.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-serif text-[14px] text-moria-black leading-snug hover:text-copper transition-colors line-clamp-2 block"
                  >
                    {alert.title}
                  </a>
                  <div className="mt-2 flex items-center gap-3 text-[10px] font-mono">
                    <span className="text-moria-pos">
                      For {alert.current_result.for.toFixed(0)}%
                    </span>
                    <span className="text-moria-neg">
                      Against {alert.current_result.against.toFixed(0)}%
                    </span>
                    <span className="text-moria-light ml-auto">
                      {(() => {
                        const days = Math.round(
                          (new Date(alert.voting_ends).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24),
                        );
                        return days < 0 ? "ended" : days === 0 ? "ends today" : `${days}d left`;
                      })()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INTELLIGENCE FEED (Aragorn) ────────── */}
        {topIntelItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-moria-black">
                  Intelligence
                </h2>
                <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                  Aragorn
                </span>
                {intelligence && intelligence.summary.by_priority.high > 0 && (
                  <span className="px-2 py-0.5 bg-copper/10 text-copper text-[10px] font-mono font-medium rounded">
                    {intelligence.summary.by_priority.high} HIGH
                  </span>
                )}
              </div>
              <Link
                href="/intelligence"
                className="text-copper text-[11px] font-mono hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topIntelItems.map((item: IntelligenceItem) => (
                <div key={item.id} className="card p-4">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-copper text-[9px] font-mono font-medium uppercase tracking-widest">
                      {item.category}
                    </span>
                    <span className="text-moria-rule text-[9px]">·</span>
                    <span className="font-mono text-[10px] text-moria-dim">
                      {item.source}
                    </span>
                    {item.priority === "high" && (
                      <span className="px-1.5 py-0.5 bg-copper text-white text-[9px] font-mono font-medium rounded tracking-wider">
                        HIGH
                      </span>
                    )}
                  </div>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-serif text-[14px] leading-snug text-moria-black hover:text-copper transition-colors line-clamp-2 block"
                  >
                    {item.title}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PREDICTION MARKETS ─────────────────── */}
        {headlinesData && headlinesData.polymarket.length > 0 && (
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">
              Prediction Markets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(polymarketByCategory).map(([category, events]) => (
                <div key={category} className="card p-5">
                  <p className="text-copper text-[9px] font-mono font-medium uppercase tracking-widest mb-4">
                    {category}
                  </p>
                  <div className="space-y-3">
                    {events.slice(0, 3).map((event) => {
                      const yesOutcome = event.outcomes?.find(
                        (o) => o.name === "Yes"
                      );
                      const yesPct = yesOutcome
                        ? yesOutcome.probability * 100
                        : 50;

                      return (
                        <div key={event.id}>
                          <p className="text-[13px] text-moria-body leading-snug mb-1.5">
                            {event.question}
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-moria-faint rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${yesPct}%`,
                                  background:
                                    yesPct >= 60
                                      ? "var(--pos)"
                                      : yesPct >= 40
                                      ? "var(--copper)"
                                      : "var(--neg)",
                                }}
                              />
                            </div>
                            <span className="font-mono text-[11px] tabular-nums text-moria-black font-medium w-10 text-right">
                              {yesPct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PERPS ──────────────────────────────── */}
        {hasPerps && (
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">
              Perp Monitor
            </h2>
            <PerpsTable
              perps={portfolio.perps}
              totalExposure={portfolio.total_perp_exposure}
              avgLeverage={portfolio.avg_leverage}
              maxLoss={portfolio.max_perp_loss}
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
