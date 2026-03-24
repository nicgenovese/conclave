import { getPortfolio } from "@/lib/data";
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
        <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>

        {/* Data freshness indicator */}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <p className="text-[hsl(215,20%,55%)] text-sm">
            Last updated: {portfolio.updated_at}
          </p>
          {stale && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Stale (&gt;24h)
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
              <NavCard nav={portfolio.nav} updatedAt={portfolio.updated_at} />
              <AllocationChart buckets={portfolio.allocation_buckets} />
            </div>

            <div className="mt-4 sm:mt-6">
              <PositionsTable positions={portfolio.positions} />
            </div>

            <div className="mt-4 sm:mt-6">
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
