import { getPortfolio, getHeadlines } from "@/lib/data";
import { formatUSD } from "@/lib/utils";
import PerpsTable from "@/components/dashboard/perps-table";
import { ErrorBoundary } from "@/components/error-boundary";
import type { PolymarketEvent } from "@/lib/types";
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
