import {
  getOri,
  getRiskAlerts,
  getMacroDataFull,
  getHeadlines,
  getStorylines,
  getPrices,
  getDurinBrief,
} from "@/lib/data";
import { ErrorBoundary } from "@/components/error-boundary";
import { StorylineCard } from "@/components/dashboard/storyline-card";
import { AgentStatusStrip, type AgentStatus } from "@/components/dashboard/agent-status";
import { NavReturnCard } from "@/components/dashboard/nav-return-card";
import { FedRatesCard } from "@/components/dashboard/fed-rates-card";
import { GlobalPredictions } from "@/components/dashboard/global-predictions";
import { DailyBriefCard } from "@/components/dashboard/daily-brief-card";
import type { RiskAlert, PolymarketEvent } from "@/lib/types";
import Link from "next/link";

// ─────────────────────────────────────────────
// Dashboard — ruthlessly focused.
// One question: "What should I care about right now?"
// Answer in 10 seconds: NAV return, rates, what the world expects, the brief.
// ─────────────────────────────────────────────
export default function Home() {
  const ori = getOri();
  const riskAlerts = getRiskAlerts();
  const macro = getMacroDataFull();
  const headlines = getHeadlines();
  const storylinesData = getStorylines();
  const prices = getPrices();
  const durinBrief = getDurinBrief();

  const storylines = storylinesData?.storylines ?? [];
  const polymarketEvents: PolymarketEvent[] = headlines?.polymarket ?? [];

  const criticalCount = riskAlerts?.summary?.critical ?? 0;
  const warningCount = riskAlerts?.summary?.warning ?? 0;
  const showRiskBanner = criticalCount + warningCount > 0;

  // Benchmarks: BTC, ETH, S&P 500 pulled from the unified prices dictionary
  const benchmarkList = ["BTC", "ETH", "SPX"]
    .map((t) => prices?.tokens[t])
    .filter((t): t is NonNullable<typeof t> => !!t);

  // Agent health strip
  const agentStatuses: AgentStatus[] = [
    {
      name: "ori",
      label: "Ori",
      updated_at: ori?.updated_at ?? null,
      ok: ori?.health.defillama === "ok",
    },
    {
      name: "durin",
      label: "Durin",
      updated_at: durinBrief?.updated_at ?? null,
      ok: !!durinBrief && durinBrief.confidence !== "STUB",
    },
    {
      name: "storylines",
      label: "Storylines",
      updated_at: storylinesData?.updated_at ?? null,
      ok: storylines.length > 0,
    },
    {
      name: "prices",
      label: "Prices",
      updated_at: prices?.updated_at ?? null,
      ok: !!prices && Object.values(prices.tokens).some((t) => t.price !== null),
    },
  ];

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* ═══════════════════════════════════════
            HEADER + AGENT STATUS STRIP
            ═══════════════════════════════════════ */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
            <div>
              <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
                Conclave · Moria Capital
              </p>
              <h1 className="text-[22px] sm:text-[30px] font-semibold tracking-tight text-moria-black leading-none">
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
            </div>
          </div>
          <AgentStatusStrip agents={agentStatuses} />
        </div>

        {/* ═══════════════════════════════════════
            RISK BANNER — critical only
            ═══════════════════════════════════════ */}
        {showRiskBanner && riskAlerts && (
          <div className="card overflow-hidden border-l-4 border-moria-neg">
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[14px] font-semibold text-moria-black">Risk</h2>
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
              <Link href="/defi" className="text-copper text-[11px] font-mono hover:underline">
                View book →
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
                      <p className="text-[13px] font-medium text-moria-black">
                        {alert.title}
                      </p>
                      <p className="text-[12px] text-moria-dim mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            HERO TRIPTYCH — NAV / Fed & Rates / Global Predictions
            ═══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <NavReturnCard ori={ori} benchmarks={benchmarkList} />
          <FedRatesCard macro={macro} polymarket={polymarketEvents} />
          <GlobalPredictions polymarket={polymarketEvents} />
        </div>

        {/* ═══════════════════════════════════════
            DAILY BRIEF — Durin's letter, wide
            ═══════════════════════════════════════ */}
        <DailyBriefCard brief={durinBrief} />

        {/* ═══════════════════════════════════════
            STORYLINES — 4 big picture cards
            ═══════════════════════════════════════ */}
        {storylines.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-moria-black">
                  Today&rsquo;s Big Picture
                </h2>
                <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                  Storylines · 12h refresh
                </span>
              </div>
              <Link href="/flow" className="text-copper text-[11px] font-mono hover:underline">
                More flow →
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {storylines.slice(0, 4).map((s, i) => (
                <StorylineCard key={s.rank} storyline={s} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Everything else — portfolio details, DeFi valuation, news, governance —
            lives in dedicated tabs. The dashboard is ruthlessly focused. */}
        <div className="flex items-center justify-center gap-6 py-6 border-t border-moria-rule/30">
          <Link
            href="/defi"
            className="text-[11px] font-mono text-moria-dim hover:text-copper transition-colors"
          >
            → DeFi book
          </Link>
          <Link
            href="/markets"
            className="text-[11px] font-mono text-moria-dim hover:text-copper transition-colors"
          >
            → Markets
          </Link>
          <Link
            href="/flow"
            className="text-[11px] font-mono text-moria-dim hover:text-copper transition-colors"
          >
            → Flow
          </Link>
          <Link
            href="/governance"
            className="text-[11px] font-mono text-moria-dim hover:text-copper transition-colors"
          >
            → Governance
          </Link>
          <Link
            href="/research"
            className="text-[11px] font-mono text-moria-dim hover:text-copper transition-colors"
          >
            → Research
          </Link>
        </div>
      </div>
    </ErrorBoundary>
  );
}
