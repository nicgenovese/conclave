import { PerpPosition } from "@/lib/types";
import { formatUSD } from "@/lib/utils";

interface PerpsTableProps {
  perps: PerpPosition[];
  totalExposure: number;
  avgLeverage: number;
  maxLoss: number;
}

export default function PerpsTable({
  perps,
  totalExposure,
  avgLeverage,
  maxLoss,
}: PerpsTableProps) {
  return (
    <div>
      <p className="text-copper text-[11px] font-medium uppercase tracking-wide mb-4">
        Perpetuals
      </p>

      {/* Summary stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-copper text-[11px] font-medium uppercase tracking-wide">
            Total Exposure
          </p>
          <p className="font-mono text-[18px] tabular-nums mt-1 text-moria-black">
            {formatUSD(totalExposure)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-copper text-[11px] font-medium uppercase tracking-wide">
            Avg Leverage
          </p>
          <p className="font-mono text-[18px] tabular-nums mt-1 text-moria-black">
            {avgLeverage.toFixed(1)}x
          </p>
        </div>
        <div className="stat-card">
          <p className="text-copper text-[11px] font-medium uppercase tracking-wide">
            Max Loss
          </p>
          <p className="font-mono text-[18px] tabular-nums mt-1 text-moria-neg">
            {formatUSD(maxLoss)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="moria-table">
            <thead>
              <tr>
                <th>Pair</th>
                <th className="text-right">Leverage</th>
                <th className="text-right">Capital</th>
                <th className="text-right">Entry 1</th>
                <th className="text-right">Entry 2</th>
                <th className="text-right">Stop Loss</th>
              </tr>
            </thead>
            <tbody>
              {perps.map((perp) => (
                <tr key={perp.pair}>
                  <td>
                    <span className="font-mono font-medium text-moria-black">
                      {perp.pair}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-moria-dim">
                      {perp.leverage}x
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-moria-black">
                      {formatUSD(perp.capital_usd)}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-moria-black">
                      {formatUSD(perp.entry_1)}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-moria-black">
                      {formatUSD(perp.entry_2)}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-moria-neg">
                      {formatUSD(perp.stop)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
