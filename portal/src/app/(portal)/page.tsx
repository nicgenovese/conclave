import {
  getPortfolio,
  getHeadlines,
  getGovernance,
  getRiskAlerts,
  getCommodities,
  getMacroDataFull,
  getIntelligence,
  getOri,
  getGimli,
  getStorylines,
} from "@/lib/data";
import { formatUSD } from "@/lib/utils";
import { ErrorBoundary } from "@/components/error-boundary";
import { StorylineCard } from "@/components/dashboard/storyline-card";
import type {
  RiskAlert,
  GovernanceAlert,
  IntelligenceItem,
  PolymarketEvent,
  GimliProtocol,
} from "@/lib/types";
import Link from "next/link";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function isStale(dateStr: string): boolean {
  if (!dateStr || dateStr === "N/A") return true;
  try {
    return Date.now() - new Date(dateStr).getTime() > 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function hoursAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const h = diff / (1000 * 60 * 60);
    if (h < 1) return "just now";
    if (h < 24) return `${Math.round(h)}h ago`;
    if (h < 48) return "yesterday";
    return `${Math.round(h / 24)}d ago`;
  } catch {
    return iso;
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

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
export default function Home() {
  // Ori is the source of truth; portfolio is the legacy-shape shim for existing code paths
  const ori = getOri();
  const portfolio = getPortfolio();
  const gimli = getGimli();
  const headlines = getHeadlines();
  const governance = getGovernance();
  const riskAlerts = getRiskAlerts();
  const commodities = getCommodities();
  const macro = getMacroDataFull();
  const intelligence = getIntelligence();
  const storylinesData = getStorylines();
  const storylines = storylinesData?.storylines ?? [];

  const stale = isStale(portfolio.updated_at);
  const criticalCount = riskAlerts?.summary?.critical ?? 0;
  const warningCount = riskAlerts?.summary?.warning ?? 0;
  const showRiskBanner = criticalCount + warningCount > 0;

  const topIntel: IntelligenceItem[] = (intelligence?.top_stories || []).slice(0, 6);
  const topGovernance: GovernanceAlert[] = (governance?.active || [])
    .filter((a) => a.relevance === "high" || a.relevance === "medium")
    .slice(0, 3);
  const topPolymarket: PolymarketEvent[] = (headlines?.polymarket || []).slice(0, 4);
  const topPositions = portfolio.positions.slice(0, 6);

  // Gimli DeFi valuation: top 5 cheapest + top 3 most expensive for the dashboard
  const topCheap: GimliProtocol[] = (gimli?.cheapest || []).slice(0, 5);
  const topExpensive: GimliProtocol[] = (gimli?.most_expensive || []).slice(0, 3);
  const hasPerps = portfolio.perps.length > 0;

  return (
    <ErrorBoundary>
      <div className="space-y-10">
        {/* ═══════════════════════════════════════
            HEADER
            ═══════════════════════════════════════ */}
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
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {ori && (
              <div className="mt-1 flex items-center sm:justify-end gap-2 text-[10px] font-mono text-moria-light">
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full inline-block ${
                      ori.health.defillama === "ok" ? "bg-moria-pos" : "bg-moria-neg"
                    }`}
                  />
                  DeFi Llama
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full inline-block ${
                      ori.health.hyperliquid === "ok" ? "bg-moria-pos" : "bg-moria-neg"
                    }`}
                  />
                  Hyperliquid
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full inline-block ${
                      ori.health.etherscan === "ok"
                        ? "bg-moria-pos"
                        : ori.health.etherscan === "stub"
                          ? "bg-copper"
                          : "bg-moria-neg"
                    }`}
                  />
                  Etherscan {ori.health.etherscan === "stub" ? "(stub)" : ""}
                </span>
              </div>
            )}
            {stale && (
              <p className="text-copper text-[11px] font-mono mt-0.5 flex items-center sm:justify-end gap-1.5">
                <span className="h-1.5 w-1.5 bg-copper rounded-full inline-block" />
                Portfolio data stale
              </p>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════
            RISK ALERTS (critical only, at the top)
            ═══════════════════════════════════════ */}
        {showRiskBanner && riskAlerts && (
          <div className="card overflow-hidden border-l-4 border-moria-neg">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[15px] font-semibold text-moria-black">Risk</h2>
                <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                  Balin
                </span>
                {criticalCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-moria-neg text-white text-[10px] font-mono font-medium rounded">
                    <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                    {criticalCount} CRITICAL
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="px-2 py-0.5 bg-copper/10 text-copper text-[10px] font-mono font-medium rounded">
                    {warningCount} WARNING
                  </span>
                )}
              </div>
              <Link href="/risk" className="text-copper text-[11px] font-mono hover:underline">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-moria-rule/30">
              {riskAlerts.alerts
                .filter((a) => a.severity !== "info")
                .slice(0, 4)
                .map((alert: RiskAlert) => (
                  <div key={alert.id} className="px-5 py-3 flex items-start gap-3">
                    <div
                      className={`h-2 w-2 mt-1.5 rounded-full flex-shrink-0 ${
                        alert.severity === "critical" ? "bg-moria-neg" : "bg-copper"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-moria-black">{alert.title}</p>
                      <p className="text-[12px] text-moria-dim mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            HERO — Today's Big Picture (4 storylines + Polymarket odds)
            ═══════════════════════════════════════ */}
        {storylines.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[15px] font-semibold text-moria-black">
                  Today&rsquo;s Big Picture
                </h2>
                <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                  Storylines
                </span>
                {storylinesData && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-moria-light">
                    <span className="h-1.5 w-1.5 rounded-full bg-moria-pos animate-pulse inline-block" />
                    updated {hoursAgo(storylinesData.updated_at)}
                  </span>
                )}
              </div>
              {storylinesData && (
                <span className="text-[10px] font-mono text-moria-light hidden sm:inline">
                  refreshes every 12h · next {hoursAgo(storylinesData.next_refresh_at)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {storylines.slice(0, 4).map((s, i) => (
                <StorylineCard key={s.rank} storyline={s} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            1. MACRO — the big picture
            ═══════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <h2 className="text-[15px] font-semibold text-moria-black">Macro</h2>
            <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
              Elrond
            </span>
          </div>
          <Link href="/macro" className="block">
            <div className="card p-5 hover:shadow-card-hover transition-shadow">
              {macro ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-moria-light mb-1">
                        Regime
                      </p>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded text-[12px] font-mono font-semibold tracking-wider ${
                            macro.regime === "risk_on"
                              ? "bg-moria-pos/10 text-moria-pos"
                              : macro.regime === "risk_off"
                              ? "bg-moria-neg/10 text-moria-neg"
                              : "bg-moria-faint text-moria-dim"
                          }`}
                        >
                          {macro.regime.toUpperCase().replace("_", " ")}
                        </span>
                        <p className="text-[13px] text-moria-dim">{macro.regime_summary}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-moria-rule/30">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
                        Fed Funds
                      </p>
                      <p className="font-mono text-[18px] tabular-nums text-moria-black">
                        {macro.fed.funds_rate.value !== null
                          ? `${macro.fed.funds_rate.value.toFixed(2)}%`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
                        10Y
                      </p>
                      <p className="font-mono text-[18px] tabular-nums text-moria-black">
                        {macro.yields.y10.value !== null
                          ? `${macro.yields.y10.value.toFixed(2)}%`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
                        CPI YoY
                      </p>
                      <p className="font-mono text-[18px] tabular-nums text-moria-black">
                        {macro.inflation.cpi_yoy_pct.value !== null
                          ? `${macro.inflation.cpi_yoy_pct.value.toFixed(1)}%`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
                        Unemployment
                      </p>
                      <p className="font-mono text-[18px] tabular-nums text-moria-black">
                        {macro.employment.unrate.value !== null
                          ? `${macro.employment.unrate.value.toFixed(1)}%`
                          : "—"}
                      </p>
                    </div>
                  </div>
                  {macro.health.fred === "no_key" && (
                    <p className="text-[11px] text-copper mt-3">
                      Add FRED_API_KEY to enable live FRED data (free)
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-moria-light">
                  Run Elrond to populate macro data.
                </p>
              )}
            </div>
          </Link>
        </section>

        {/* ═══════════════════════════════════════
            1b. DeFi VALUATION (Gimli) — cheap vs expensive
            ═══════════════════════════════════════ */}
        {gimli && gimli.summary.total_analyzed > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-moria-black">DeFi Valuation</h2>
                <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                  Gimli
                </span>
                <span className="px-2 py-0.5 bg-moria-pos/10 text-moria-pos text-[10px] font-mono font-medium rounded">
                  {gimli.summary.cheap} CHEAP
                </span>
                <span className="px-2 py-0.5 bg-moria-neg/10 text-moria-neg text-[10px] font-mono font-medium rounded">
                  {gimli.summary.expensive} EXPENSIVE
                </span>
              </div>
            </div>

            <div className="card overflow-hidden">
              {/* FACT block */}
              <div className="px-5 pt-4 pb-3 bg-moria-faint/30 border-b border-moria-rule/40">
                <span className="text-[9px] font-mono uppercase tracking-widest text-moria-dim">
                  FACT &middot; DeFi Llama revenue / market cap / TradFi peer comparison
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[12px] sm:text-[13px]">
                  <thead>
                    <tr className="border-b border-copper bg-[#F5F4F2]">
                      <th className="text-left px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                        Protocol
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                        P/E
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim hidden sm:table-cell">
                        Peer (TradFi)
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim hidden md:table-cell">
                        Upside to Peer
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim hidden lg:table-cell">
                        Fee Switch
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCheap.map((p) => (
                      <tr key={`cheap-${p.ticker}`} className="border-b border-moria-rule/30">
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-moria-pos" />
                            <span className="font-mono font-medium text-moria-black">
                              {p.ticker}
                            </span>
                            <span className="text-[10px] text-moria-light hidden sm:inline">
                              {p.theme}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right font-mono tabular-nums text-moria-black">
                          {p.pe_ratio !== null ? `${p.pe_ratio.toFixed(1)}x` : "—"}
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right text-[11px] text-moria-dim hidden sm:table-cell">
                          {p.peer_pe_range}
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right font-mono tabular-nums text-moria-pos hidden md:table-cell">
                          {p.upside_to_peer_pct !== null
                            ? `+${p.upside_to_peer_pct.toFixed(0)}%`
                            : "—"}
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right hidden lg:table-cell">
                          <span
                            className={`text-[10px] font-mono ${
                              p.fee_switch.state === "live_full"
                                ? "text-moria-pos"
                                : p.fee_switch.state === "not_activated"
                                ? "text-moria-neg"
                                : "text-moria-dim"
                            }`}
                          >
                            {p.fee_switch.state.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {topExpensive.map((p) => (
                      <tr key={`exp-${p.ticker}`} className="border-b border-moria-rule/30 bg-moria-faint/20">
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-moria-neg" />
                            <span className="font-mono font-medium text-moria-black">
                              {p.ticker}
                            </span>
                            <span className="text-[10px] text-moria-light hidden sm:inline">
                              {p.theme}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right font-mono tabular-nums text-moria-neg">
                          {p.pe_ratio !== null ? `${p.pe_ratio.toFixed(1)}x` : "—"}
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right text-[11px] text-moria-dim hidden sm:table-cell">
                          {p.peer_pe_range}
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right font-mono tabular-nums text-moria-dim hidden md:table-cell">
                          —
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right hidden lg:table-cell">
                          <span
                            className={`text-[10px] font-mono ${
                              p.fee_switch.state === "live_full"
                                ? "text-moria-pos"
                                : p.fee_switch.state === "not_activated"
                                ? "text-moria-neg"
                                : "text-moria-dim"
                            }`}
                          >
                            {p.fee_switch.state.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* INFERENCE block — Sonnet narrative (stubbed in Wave 1) */}
              <div className="px-5 py-4 bg-moria-faint/20 border-t border-moria-rule/40">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-copper">
                    {gimli.narrative.confidence === "STUB" ? "INFERENCE (stubbed)" : "INFERENCE"}
                  </span>
                  <span className="text-[9px] font-mono text-moria-light">
                    · {gimli.narrative.model}
                  </span>
                </div>
                <p
                  className={`font-serif text-[13px] leading-relaxed ${
                    gimli.narrative.confidence === "STUB"
                      ? "text-moria-light italic"
                      : "text-moria-body"
                  }`}
                >
                  {gimli.narrative.text}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            2. NEWS — what's happening in the world
            ═══════════════════════════════════════ */}
        {topIntel.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-moria-black">News</h2>
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
              {topIntel.map((item) => (
                <div key={item.id} className="card p-4">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-copper text-[9px] font-mono font-medium uppercase tracking-widest">
                      {item.category}
                    </span>
                    <span className="text-moria-rule text-[9px]">·</span>
                    <span className="font-mono text-[10px] text-moria-dim">{item.source}</span>
                    <span className="text-moria-rule text-[9px]">·</span>
                    <span className="font-mono text-[10px] text-moria-light">
                      {hoursAgo(item.published)}
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
          </section>
        )}

        {/* ═══════════════════════════════════════
            3. COMMODITIES — the fund's edge
            ═══════════════════════════════════════ */}
        {commodities && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-moria-black">Commodities</h2>
                <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                  Gimli
                </span>
                {commodities.signals.length > 0 && (
                  <span className="px-2 py-0.5 bg-copper/10 text-copper text-[10px] font-mono font-medium rounded">
                    {commodities.signals.length} SIGNAL{commodities.signals.length !== 1 ? "S" : ""}
                  </span>
                )}
              </div>
              <Link
                href="/commodities"
                className="text-copper text-[11px] font-mono hover:underline"
              >
                View all →
              </Link>
            </div>
            <Link href="/commodities" className="block">
              <div className="card p-5 hover:shadow-card-hover transition-shadow">
                {/* Signals first, if any */}
                {commodities.signals.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-moria-rule/30 space-y-2">
                    {commodities.signals.slice(0, 3).map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            s.severity === "warning" ? "bg-copper" : "bg-moria-light"
                          }`}
                        />
                        <p className="text-[13px] text-moria-black">{s.message}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* Prices row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
                      Gold (PAXG)
                    </p>
                    <p className="font-mono text-[16px] tabular-nums text-moria-black">
                      {commodities.tokenized.paxg_usd.value !== null
                        ? `$${commodities.tokenized.paxg_usd.value.toFixed(0)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
                      Copper (spot)
                    </p>
                    <p className="font-mono text-[16px] tabular-nums text-moria-black">
                      {commodities.spot.copper_usd_lb.value !== null
                        ? `$${commodities.spot.copper_usd_lb.value.toFixed(2)}/lb`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
                      WTI Oil
                    </p>
                    <p className="font-mono text-[16px] tabular-nums text-moria-black">
                      {commodities.spot.wti_usd_bbl.value !== null
                        ? `$${commodities.spot.wti_usd_bbl.value.toFixed(0)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
                      FCX
                    </p>
                    <p className="font-mono text-[16px] tabular-nums text-moria-black">
                      {commodities.mining_equities.freeport_fcx.value !== null
                        ? `$${commodities.mining_equities.freeport_fcx.value.toFixed(0)}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ═══════════════════════════════════════
            4. GOVERNANCE — decisions that affect us
            ═══════════════════════════════════════ */}
        {topGovernance.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-moria-black">Governance</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topGovernance.map((alert) => (
                <div key={alert.id} className="card p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono font-medium text-copper text-[11px]">
                      {alert.protocol}
                    </span>
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
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            5. POLYMARKET — market predictions
            ═══════════════════════════════════════ */}
        {topPolymarket.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <h2 className="text-[15px] font-semibold text-moria-black">
                Prediction Markets
              </h2>
              <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                Polymarket
              </span>
            </div>
            <div className="card p-5 space-y-4">
              {topPolymarket.map((event) => {
                const yes = event.outcomes?.find((o) => o.name === "Yes");
                const yesPct = yes ? yes.probability * 100 : 50;
                return (
                  <div key={event.id}>
                    <p className="text-[13px] text-moria-black leading-snug mb-1.5">
                      {event.question}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-moria-faint rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
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
          </section>
        )}

        {/* ═══════════════════════════════════════
            6. PORTFOLIO — where we are
            ═══════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[15px] font-semibold text-moria-black">Portfolio</h2>
              <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                Durin
              </span>
            </div>
            <p className="font-mono text-[11px] text-moria-light">
              as of {portfolio.updated_at}
            </p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
            <div className="card p-3 sm:p-5">
              <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                NAV
              </p>
              <p className="font-mono text-[20px] sm:text-[28px] tabular-nums text-moria-black leading-tight">
                {formatUSD(portfolio.nav)}
              </p>
            </div>
            <div className="card p-3 sm:p-5">
              <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                Positions
              </p>
              <p className="font-mono text-[20px] sm:text-[28px] tabular-nums text-moria-black leading-tight">
                {portfolio.positions.length}
              </p>
              <p className="text-moria-dim text-[10px] sm:text-xs mt-0.5">
                {portfolio.allocation_buckets.length} buckets
              </p>
            </div>
            <div className="card p-3 sm:p-5">
              <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                Perps
              </p>
              <p className="font-mono text-[20px] sm:text-[28px] tabular-nums text-moria-black leading-tight">
                {formatUSD(portfolio.total_perp_exposure)}
              </p>
              <p className="text-moria-dim text-[10px] sm:text-xs mt-0.5">
                {portfolio.avg_leverage.toFixed(1)}x avg
              </p>
            </div>
            <div className="card p-3 sm:p-5">
              <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                Max Loss
              </p>
              <p className="font-mono text-[20px] sm:text-[28px] tabular-nums text-moria-neg leading-tight">
                {formatUSD(portfolio.max_perp_loss)}
              </p>
            </div>
          </div>

          {/* Positions table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] sm:text-[13px]">
                <thead>
                  <tr className="border-t-2 border-copper bg-[#F5F4F2]">
                    <th className="text-left px-3 sm:px-5 py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                      Asset
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                      Value
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim hidden sm:table-cell">
                      Alloc
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim hidden sm:table-cell">
                      P&L
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim hidden lg:table-cell">
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
                        <span className="text-[11px] text-moria-light">{pos.bucket}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            7. PERPS — leveraged positions
            ═══════════════════════════════════════ */}
        {hasPerps && (
          <section>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">Perp Monitor</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] sm:text-[13px]">
                  <thead>
                    <tr className="border-t-2 border-copper bg-[#F5F4F2]">
                      <th className="text-left px-3 sm:px-5 py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                        Pair
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                        Leverage
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                        Capital
                      </th>
                      <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-moria-dim hidden sm:table-cell">
                        Stop
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.perps.map((perp) => (
                      <tr key={perp.pair} className="border-b border-moria-rule/30">
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                          <span className="font-mono font-medium text-moria-black">
                            {perp.pair}
                          </span>
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right font-mono text-moria-dim">
                          {perp.leverage}x
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right font-mono tabular-nums text-moria-black">
                          {formatUSD(perp.capital_usd)}
                        </td>
                        <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right font-mono tabular-nums text-moria-neg hidden sm:table-cell">
                          ${perp.stop.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </ErrorBoundary>
  );
}
