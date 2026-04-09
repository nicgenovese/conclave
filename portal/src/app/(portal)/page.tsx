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

  const renderPolymarketCategory = (category: string) => {
    const events = polymarketByCategory[category];
    if (!events) return null;

    return (
      <div key={category} className="card p-5">
        <p className="text-copper text-[11px] font-medium uppercase tracking-wide mb-4">
          {category}
        </p>
        <div className="space-y-4">
          {events.map((event) => {
            const yesOutcome = event.outcomes?.find((o) => o.name === "Yes");
            const noOutcome = event.outcomes?.find((o) => o.name === "No");
            const yesPct = yesOutcome ? yesOutcome.probability * 100 : 0;
            const noPct = noOutcome ? noOutcome.probability * 100 : 0;

            return (
              <div key={event.id} className="py-3">
                <p className="font-serif text-[14px] text-moria-black">
                  {event.question}
                </p>
                {/* Probability bar */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-1.5 relative bg-moria-faint rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-1.5 rounded-full"
                      style={{
                        width: `${yesPct}%`,
                        background: yesPct >= 50 ? "var(--pos)" : "var(--copper)",
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-[12px] tabular-nums text-moria-pos">
                      Yes {yesPct.toFixed(0)}%
                    </span>
                    <span className="font-mono text-[12px] text-moria-rule">/</span>
                    <span className="font-mono text-[12px] tabular-nums text-moria-neg">
                      No {noPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="font-mono text-[10px] mt-1 text-moria-light">
                  Vol {formatNumber(event.volume_usd)} &middot; Ends {event.end_date}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div>
        {/* Morning Brief Header */}
        <div className="mb-10">
          <p className="text-copper text-[11px] font-medium uppercase tracking-wide mb-3">
            Conclave Morning Brief
          </p>
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] text-moria-dim">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            {headlinesData && (
              <p className="font-mono text-[11px] text-moria-light">
                Updated {headlinesData.updated_at.replace("T", " ").slice(0, 16)} UTC
              </p>
            )}
          </div>
        </div>

        {/* ========================================= */}
        {/* Headlines */}
        {/* ========================================= */}
        <h2 className="text-[20px] font-semibold text-moria-black mb-6">Headlines</h2>

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
          <div className="mb-12 space-y-4">
            {headlinesData.headlines.map((headline, i) => (
              <div key={i} className="card p-5">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-copper text-[11px] font-medium uppercase tracking-wide flex-shrink-0">
                    {headline.category}
                  </span>
                </div>
                <p className="font-serif text-[16px] font-bold leading-snug text-moria-black">
                  {headline.url ? (
                    <a href={headline.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {headline.title}
                    </a>
                  ) : (
                    headline.title
                  )}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="font-mono text-[11px] text-moria-dim">
                    {headline.source}
                  </span>
                  <span className="font-mono text-[11px] text-moria-light">
                    {formatDate(headline.date)}
                  </span>
                  {headline.relevance && (
                    <>
                      <span className="text-moria-rule">|</span>
                      <span className="text-[12px] italic text-moria-dim">
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
        {/* Markets (Polymarket) */}
        {/* ========================================= */}
        <h2 className="text-[20px] font-semibold text-moria-black mb-6 mt-12">Markets</h2>

        {!headlinesData || headlinesData.polymarket.length === 0 ? (
          <DataError
            title="No prediction market data"
            message="Run Durin to populate Polymarket events."
          />
        ) : (
          <div className="mb-12 space-y-5">
            {categoryOrder.map((cat) => renderPolymarketCategory(cat))}
            {Object.keys(polymarketByCategory)
              .filter((cat) => !categoryOrder.includes(cat))
              .map((cat) => renderPolymarketCategory(cat))}
          </div>
        )}

        {/* ========================================= */}
        {/* Portfolio */}
        {/* ========================================= */}
        <h2 className="text-[20px] font-semibold text-moria-black mb-6 mt-12">Portfolio</h2>

        <div className="flex items-center gap-3 mb-6">
          <p className="font-mono text-[12px] text-moria-light">
            As of {portfolio.updated_at}
          </p>
          {stale && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-copper">
              <span className="inline-block h-1.5 w-1.5 bg-copper rounded-full" />
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
            <div className="grid grid-cols-3 gap-4">
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

            {/* Positions -- top 6 only */}
            <div className="mt-10">
              <PositionsTable
                positions={portfolio.positions.slice(0, 6)}
              />
              {portfolio.positions.length > 6 && (
                <div className="mt-3">
                  <Link
                    href="/risk"
                    className="text-copper font-mono text-[12px] hover:underline"
                  >
                    View all {portfolio.positions.length} positions &rarr;
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================= */}
        {/* Perp Monitor */}
        {/* ========================================= */}
        {portfolio.perps.length > 0 && (
          <div className="mt-12">
            <h2 className="text-[20px] font-semibold text-moria-black mb-6">Perp Monitor</h2>
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
