import { getPortfolio } from "@/lib/data";
import { formatUSD } from "@/lib/utils";
import NavCard from "@/components/dashboard/nav-card";
import AllocationChart from "@/components/dashboard/allocation-chart";
import PositionsTable from "@/components/dashboard/positions-table";
import PerpsTable from "@/components/dashboard/perps-table";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";

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

export default function Home() {
  const portfolio = getPortfolio();
  const stale = isStale(portfolio.updated_at);
  const isEmpty = portfolio.nav === 0 && portfolio.positions.length === 0;

  return (
    <ErrorBoundary>
      <div>
        {/* Section Header */}
        <div className="section-header">
          <span className="section-number">01.</span>
          <h1 className="section-title">Overview</h1>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <p className="font-mono text-[12px]" style={{ color: "var(--light)" }}>
            Portfolio as of {portfolio.updated_at}
          </p>
          {stale && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px]" style={{ color: "var(--copper)" }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--copper)" }} />
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
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4" style={{ borderTop: "0.5px solid var(--rule)" }}>
              <NavCard
                label="NAV"
                value={formatUSD(portfolio.nav)}
              />
              <NavCard
                label="Positions"
                value={String(portfolio.positions.length)}
                subtitle={`${portfolio.allocation_buckets.length} buckets`}
              />
              <NavCard
                label="Perp Exposure"
                value={formatUSD(portfolio.total_perp_exposure)}
                subtitle={`${portfolio.avg_leverage.toFixed(1)}x avg leverage`}
              />
              <NavCard
                label="Max Perp Loss"
                value={formatUSD(portfolio.max_perp_loss)}
                trend="down"
              />
            </div>

            {/* Allocation chart */}
            <div className="mt-12">
              <AllocationChart buckets={portfolio.allocation_buckets} />
            </div>

            {/* Positions */}
            <div className="mt-12">
              <PositionsTable positions={portfolio.positions} />
            </div>

            {/* Perps */}
            <div className="mt-12">
              <PerpsTable
                perps={portfolio.perps}
                totalExposure={portfolio.total_perp_exposure}
                avgLeverage={portfolio.avg_leverage}
                maxLoss={portfolio.max_perp_loss}
              />
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
