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
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-5">
        Perpetuals
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="rounded-lg bg-secondary/50 p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
            Total Exposure
          </p>
          <p className="font-mono text-base sm:text-lg font-semibold tabular-nums mt-1">
            {formatUSD(totalExposure)}
          </p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
            Avg Leverage
          </p>
          <p className="font-mono text-base sm:text-lg font-semibold tabular-nums mt-1">
            {avgLeverage.toFixed(1)}x
          </p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
            Max Loss
          </p>
          <p className="font-mono text-base sm:text-lg font-semibold tabular-nums text-red-400/80 mt-1">
            {formatUSD(maxLoss)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="-mx-5 sm:-mx-6 overflow-x-auto">
        <div className="min-w-[550px] px-5 sm:px-6">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Pair
                </th>
                <th className="text-right pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Leverage
                </th>
                <th className="text-right pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Capital
                </th>
                <th className="text-right pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Entry 1
                </th>
                <th className="text-right pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Entry 2
                </th>
                <th className="text-right pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Stop Loss
                </th>
              </tr>
            </thead>
            <tbody>
              {perps.map((perp) => (
                <tr
                  key={perp.pair}
                  className="border-b border-border/50"
                >
                  <td className="py-4 font-mono font-medium text-foreground whitespace-nowrap">
                    {perp.pair}
                  </td>
                  <td className="py-4 text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-secondary text-muted-foreground tabular-nums">
                      {perp.leverage}x
                    </span>
                  </td>
                  <td className="py-4 text-right font-mono tabular-nums text-foreground whitespace-nowrap">
                    {formatUSD(perp.capital_usd)}
                  </td>
                  <td className="py-4 text-right font-mono tabular-nums text-foreground whitespace-nowrap">
                    {formatUSD(perp.entry_1)}
                  </td>
                  <td className="py-4 text-right font-mono tabular-nums text-foreground whitespace-nowrap">
                    {formatUSD(perp.entry_2)}
                  </td>
                  <td className="py-4 text-right font-mono tabular-nums text-red-400/70 whitespace-nowrap">
                    {formatUSD(perp.stop)}
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
