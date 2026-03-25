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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Overview
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">
              Portfolio as of {portfolio.updated_at}
            </p>
            {stale && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Stale
              </span>
            )}
          </div>
        </div>

        {isEmpty ? (
          <DataError
            title="No portfolio data"
            message="Run the daily brief to populate portfolio data."
          />
        ) : (
          <>
            {/* Top stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <AllocationChart buckets={portfolio.allocation_buckets} />

            {/* Positions */}
            <PositionsTable positions={portfolio.positions} />

            {/* Perps */}
            <PerpsTable
              perps={portfolio.perps}
              totalExposure={portfolio.total_perp_exposure}
              avgLeverage={portfolio.avg_leverage}
              maxLoss={portfolio.max_perp_loss}
            />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
