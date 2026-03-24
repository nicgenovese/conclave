import { Position } from "@/lib/types";
import { formatUSD } from "@/lib/utils";

interface PositionsTableProps {
  positions: Position[];
}

const bucketColors: Record<string, string> = {
  Core: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  "DeFi Value": "bg-violet-500/20 text-violet-400 border border-violet-500/30",
  Yield: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  Emerging: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  Gas: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};

export default function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 sm:p-6">
      <h2 className="text-xs sm:text-sm text-[hsl(215,20%,55%)] uppercase tracking-wider mb-4">
        Spot Positions
      </h2>

      <div className="-mx-4 sm:mx-0 overflow-x-auto">
        <div className="min-w-[600px] sm:min-w-0 px-4 sm:px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[hsl(215,20%,55%)] text-left">
                <th className="pb-3 font-medium">Asset</th>
                <th className="pb-3 font-medium">Bucket</th>
                <th className="pb-3 font-medium text-right">Allocation</th>
                <th className="pb-3 font-medium text-right">Weight</th>
                <th className="pb-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => (
                <tr
                  key={`${pos.ticker}-${i}`}
                  className="border-b border-[hsl(215,20%,18%)]/50"
                >
                  <td className="py-3 whitespace-nowrap">
                    <span className="font-mono font-bold text-white">
                      {pos.ticker}
                    </span>
                    <span className="block text-xs sm:text-sm text-[hsl(215,20%,55%)]">
                      {pos.name}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        bucketColors[pos.bucket] || ""
                      }`}
                    >
                      {pos.bucket}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-white whitespace-nowrap">
                    {formatUSD(pos.allocation_usd)}
                  </td>
                  <td className="py-3 text-right font-mono text-white whitespace-nowrap">
                    {pos.allocation_pct.toFixed(1)}%
                  </td>
                  <td className="py-3 text-[hsl(215,20%,55%)] max-w-[200px] truncate">
                    {pos.notes || "\u2014"}
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
