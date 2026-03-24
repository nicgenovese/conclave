import { getPortfolio } from "@/lib/data";
import NavCard from "@/components/dashboard/nav-card";
import AllocationChart from "@/components/dashboard/allocation-chart";
import PositionsTable from "@/components/dashboard/positions-table";
import PerpsTable from "@/components/dashboard/perps-table";

export default function Home() {
  const portfolio = getPortfolio();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <p className="text-[hsl(215,20%,55%)] mt-1">
        Portfolio snapshot as of {portfolio.updated_at}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <NavCard nav={portfolio.nav} updatedAt={portfolio.updated_at} />
        <AllocationChart buckets={portfolio.allocation_buckets} />
      </div>

      <div className="mt-6">
        <PositionsTable positions={portfolio.positions} />
      </div>

      <div className="mt-6">
        <PerpsTable
          perps={portfolio.perps}
          totalExposure={portfolio.total_perp_exposure}
          avgLeverage={portfolio.avg_leverage}
          maxLoss={portfolio.max_perp_loss}
        />
      </div>
    </div>
  );
}
