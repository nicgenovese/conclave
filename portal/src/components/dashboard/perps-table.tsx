import { PerpPosition } from "@/lib/types";
import { formatUSD } from "@/lib/utils";

interface PerpsTableProps {
  perps: PerpPosition[];
  totalExposure: number;
  avgLeverage: number;
  maxLoss: number;
}

function leverageColor(lev: number): string {
  if (lev >= 3) return "text-amber-400";
  if (lev >= 2) return "text-yellow-400";
  return "text-white";
}

export default function PerpsTable({
  perps,
  totalExposure,
  avgLeverage,
  maxLoss,
}: PerpsTableProps) {
  return (
    <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-6">
      <h2 className="text-sm text-[hsl(215,20%,55%)] uppercase tracking-wider mb-4">
        Perp Positions (Hyperliquid)
      </h2>

      {/* Summary grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[hsl(222,47%,7%)] rounded-lg p-4 border border-[hsl(215,20%,18%)]/50">
          <p className="text-xs text-[hsl(215,20%,55%)] uppercase tracking-wider">
            Total Exposure
          </p>
          <p className="font-mono text-xl font-bold text-white mt-1">
            {formatUSD(totalExposure)}
          </p>
        </div>
        <div className="bg-[hsl(222,47%,7%)] rounded-lg p-4 border border-[hsl(215,20%,18%)]/50">
          <p className="text-xs text-[hsl(215,20%,55%)] uppercase tracking-wider">
            Avg Leverage
          </p>
          <p className="font-mono text-xl font-bold text-white mt-1">
            {avgLeverage.toFixed(1)}x
          </p>
        </div>
        <div className="bg-[hsl(222,47%,7%)] rounded-lg p-4 border border-[hsl(215,20%,18%)]/50">
          <p className="text-xs text-[hsl(215,20%,55%)] uppercase tracking-wider">
            Max Loss
          </p>
          <p className="font-mono text-xl font-bold text-red-400 mt-1">
            {formatUSD(maxLoss)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[hsl(215,20%,55%)] text-left">
              <th className="pb-3 font-medium">Pair</th>
              <th className="pb-3 font-medium text-right">Leverage</th>
              <th className="pb-3 font-medium text-right">Capital</th>
              <th className="pb-3 font-medium text-right">Entry 1</th>
              <th className="pb-3 font-medium text-right">Entry 2</th>
              <th className="pb-3 font-medium text-right">Stop Loss</th>
            </tr>
          </thead>
          <tbody>
            {perps.map((perp) => (
              <tr
                key={perp.pair}
                className="border-b border-[hsl(215,20%,18%)]/50"
              >
                <td className="py-3 font-mono font-bold text-white">
                  {perp.pair}
                </td>
                <td
                  className={`py-3 text-right font-mono font-bold ${leverageColor(
                    perp.leverage
                  )}`}
                >
                  {perp.leverage}x
                </td>
                <td className="py-3 text-right font-mono text-white">
                  {formatUSD(perp.capital_usd)}
                </td>
                <td className="py-3 text-right font-mono text-white">
                  {formatUSD(perp.entry_1)}
                </td>
                <td className="py-3 text-right font-mono text-white">
                  {formatUSD(perp.entry_2)}
                </td>
                <td className="py-3 text-right font-mono text-red-400">
                  {formatUSD(perp.stop)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
