import { getPortfolio, getHeadlines } from "@/lib/data";
import { formatUSD, formatNumber } from "@/lib/utils";
import NavCard from "@/components/dashboard/nav-card";
import PositionsTable from "@/components/dashboard/positions-table";
import PerpsTable from "@/components/dashboard/perps-table";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";
import type { PolymarketEvent } from "@/lib/types";
import Link from "next/link";

function isStale(dateStr: string): boolean {
  if (!dateStr || dateStr === "N/A") return true;
  try {
    const updated = new Date(dateStr);
    const now = new Date();
    return now.getTime() - updated.getTime() > 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function Home() {
  const portfolio = getPortfolio();
  const headlinesData = getHeadlines();
  const stale = isStale(portfolio.updated_at);
  const isEmpty = portfolio.nav === 0 && portfolio.positions.length === 0;

  // Group polymarket events by category
  const polymarketByCategory: Record<string, PolymarketEvent[]> = {};
  if (headlinesData?.polymarket) {
    for (const event of headlinesData.polymarket) {
      const cat = event.category || "Other";
      if (!polymarketByCategory[cat]) polymarketByCategory[cat] = [];
      polymarketByCategory[cat].push(event);
    }
  }

  const categoryOrder = ["Rates", "Regulation", "Crypto", "Geopolitics", "Commodities"];

  return (
    <ErrorBoundary>
      <div>
        {/* Morning Brief Header */}
        <div className="mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: "var(--copper)" }}>
            Conclave Morning Brief
          </p>
          <hr className="hairline" />
          <div className="flex items-baseline justify-between mt-3">
            <p className="font-serif text-[13px]" style={{ color: "var(--dim)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            {headlinesData && (
              <p className="font-mono text-[11px]" style={{ color: "var(--light)" }}>
                Updated {headlinesData.updated_at.replace("T", " ").slice(0, 16)} UTC
              </p>
            )}
          </div>
        </div>

        {/* ========================================= */}
        {/* Section 01: Headlines */}
        {/* ========================================= */}
        <div className="section-header">
          <span className="section-number">01.</span>
          <h1 className="section-title">Headlines</h1>
        </div>

        {!headlinesData ? (
          <DataError
            title="No headlines available"
            message="Run Durin to generate headlines."
          />
        ) : headlinesData.headlines.length === 0 ? (
          <DataError
            title="No headlines available"
            message="Headlines data is empty. Run Durin to populate."
          />
        ) : (
          <div className="mb-12">
            {headlinesData.headlines.map((headline, i) => (
              <div
                key={i}
                className="py-4"
                style={{ borderBottom: i < headlinesData.headlines.length - 1 ? "0.5px solid var(--rule)" : "none" }}
              >
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.08em] flex-shrink-0"
                    style={{ color: "var(--copper)" }}
                  >
                    {headline.category}
                  </span>
                </div>
                <p className="font-serif text-[16px] font-bold leading-snug" style={{ color: "var(--black)" }}>
                  {headline.url ? (
                    <a href={headline.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {headline.title}
                    </a>
                  ) : (
                    headline.title
                  )}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="font-mono text-[11px]" style={{ color: "var(--dim)" }}>
                    {headline.source}
                  </span>
                  <span className="font-mono text-[11px]" style={{ color: "var(--light)" }}>
                    {formatDate(headline.date)}
                  </span>
                  {headline.relevance && (
                    <>
                      <span style={{ color: "var(--rule)" }}>|</span>
                      <span className="font-serif text-[12px] italic" style={{ color: "var(--dim)" }}>
                        {headline.relevance}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================= */}
        {/* Section 02: Markets (Polymarket) */}
        {/* ========================================= */}
        <div className="section-header mt-12">
          <span className="section-number">02.</span>
          <h1 className="section-title">Markets</h1>
        </div>

        {!headlinesData || headlinesData.polymarket.length === 0 ? (
          <DataError
            title="No prediction market data"
            message="Run Durin to populate Polymarket events."
          />
        ) : (
          <div className="mb-12 space-y-8">
            {categoryOrder
              .filter((cat) => polymarketByCategory[cat])
              .map((category) => (
                <div key={category}>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.1em] mb-4"
                    style={{ color: "var(--copper)" }}
                  >
                    {category}
                  </p>
                  <div className="space-y-4">
                    {polymarketByCategory[category].map((event) => {
                      const yesOutcome = event.outcomes?.find((o) => o.name === "Yes");
                      const noOutcome = event.outcomes?.find((o) => o.name === "No");
                      const yesPct = yesOutcome ? yesOutcome.probability * 100 : 0;
                      const noPct = noOutcome ? noOutcome.probability * 100 : 0;

                      return (
                        <div
                          key={event.id}
                          className="py-3"
                          style={{ borderBottom: "0.5px solid var(--rule)" }}
                        >
                          <p className="font-serif text-[14px]" style={{ color: "var(--black)" }}>
                            {event.question}
                          </p>
                          {/* Probability bar */}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 h-1 relative" style={{ background: "var(--faint)" }}>
                              <div
                                className="absolute top-0 left-0 h-1"
                                style={{
                                  width: `${yesPct}%`,
                                  background: yesPct >= 50 ? "var(--pos)" : "var(--copper)",
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-mono text-[12px] tabular-nums" style={{ color: "var(--pos)" }}>
                                Yes {yesPct.toFixed(0)}%
                              </span>
                              <span className="font-mono text-[12px]" style={{ color: "var(--rule)" }}>/</span>
                              <span className="font-mono text-[12px] tabular-nums" style={{ color: "var(--neg)" }}>
                                No {noPct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <p className="font-mono text-[10px] mt-1" style={{ color: "var(--light)" }}>
                            Vol {formatNumber(event.volume_usd)} &middot; Ends {event.end_date}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            {/* Render any categories not in the order */}
            {Object.keys(polymarketByCategory)
              .filter((cat) => !categoryOrder.includes(cat))
              .map((category) => (
                <div key={category}>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.1em] mb-4"
                    style={{ color: "var(--copper)" }}
                  >
                    {category}
                  </p>
                  <div className="space-y-4">
                    {polymarketByCategory[category].map((event) => {
                      const yesOutcome = event.outcomes?.find((o) => o.name === "Yes");
                      const noOutcome = event.outcomes?.find((o) => o.name === "No");
                      const yesPct = yesOutcome ? yesOutcome.probability * 100 : 0;
                      const noPct = noOutcome ? noOutcome.probability * 100 : 0;

                      return (
                        <div
                          key={event.id}
                          className="py-3"
                          style={{ borderBottom: "0.5px solid var(--rule)" }}
                        >
                          <p className="font-serif text-[14px]" style={{ color: "var(--black)" }}>
                            {event.question}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 h-1 relative" style={{ background: "var(--faint)" }}>
                              <div
                                className="absolute top-0 left-0 h-1"
                                style={{
                                  width: `${yesPct}%`,
                                  background: yesPct >= 50 ? "var(--pos)" : "var(--copper)",
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-mono text-[12px] tabular-nums" style={{ color: "var(--pos)" }}>
                                Yes {yesPct.toFixed(0)}%
                              </span>
                              <span className="font-mono text-[12px]" style={{ color: "var(--rule)" }}>/</span>
                              <span className="font-mono text-[12px] tabular-nums" style={{ color: "var(--neg)" }}>
                                No {noPct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <p className="font-mono text-[10px] mt-1" style={{ color: "var(--light)" }}>
                            Vol {formatNumber(event.volume_usd)} &middot; Ends {event.end_date}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ========================================= */}
        {/* Section 03: Portfolio */}
        {/* ========================================= */}
        <div className="section-header mt-12">
          <span className="section-number">03.</span>
          <h1 className="section-title">Portfolio</h1>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <p className="font-mono text-[12px]" style={{ color: "var(--light)" }}>
            As of {portfolio.updated_at}
          </p>
          {stale && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px]" style={{ color: "var(--copper)" }}>
              <span className="inline-block h-1.5 w-1.5" style={{ background: "var(--copper)" }} />
              Stale
            </span>
          )}
        </div>

        {isEmpty ? (
          <DataError
            title="No portfolio data"
            message="Run the daily brief to populate portfolio data."
          />
        ) : (
          <>
            {/* Compact stats row */}
            <div className="grid grid-cols-3" style={{ borderTop: "0.5px solid var(--rule)" }}>
              <NavCard label="NAV" value={formatUSD(portfolio.nav)} />
              <NavCard
                label="24h Change"
                value="\u2014"
                subtitle="Awaiting price feed"
              />
              <NavCard
                label="Positions"
                value={String(portfolio.positions.length)}
                subtitle={`${portfolio.allocation_buckets.length} buckets`}
              />
            </div>

            {/* Positions — top 6 only */}
            <div className="mt-10">
              <PositionsTable
                positions={portfolio.positions.slice(0, 6)}
              />
              {portfolio.positions.length > 6 && (
                <div className="mt-3">
                  <Link
                    href="/risk"
                    className="font-mono text-[12px] hover:underline"
                    style={{ color: "var(--copper)" }}
                  >
                    View all {portfolio.positions.length} positions &rarr;
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================= */}
        {/* Section 04: Perp Monitor */}
        {/* ========================================= */}
        {portfolio.perps.length > 0 && (
          <div className="mt-12">
            <div className="section-header">
              <span className="section-number">04.</span>
              <h1 className="section-title">Perp Monitor</h1>
            </div>
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
