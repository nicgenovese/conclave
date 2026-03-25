import { Position } from "@/lib/types";
import { formatUSD } from "@/lib/utils";

interface PositionsTableProps {
  positions: Position[];
}

const bucketDotColor: Record<string, string> = {
  Core: "bg-blue-500",
  "DeFi Value": "bg-violet-500",
  Yield: "bg-emerald-500",
  Emerging: "bg-amber-500",
  Gas: "bg-zinc-400",
};

export default function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-5">
        Spot Positions
      </p>

      <div className="-mx-5 sm:-mx-6 overflow-x-auto">
        <div className="min-w-[600px] px-5 sm:px-6">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Asset
                </th>
                <th className="text-left pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Bucket
                </th>
                <th className="text-right pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Allocation
                </th>
                <th className="text-right pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Weight
                </th>
                <th className="text-left pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => (
                <tr
                  key={`${pos.ticker}-${i}`}
                  className="border-b border-border/50"
                >
                  <td className="py-4 whitespace-nowrap">
                    <span className="font-mono font-medium text-foreground">
                      {pos.ticker}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {pos.name}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          bucketDotColor[pos.bucket] || "bg-zinc-500"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {pos.bucket}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-right font-mono tabular-nums text-foreground whitespace-nowrap">
                    {formatUSD(pos.allocation_usd)}
                  </td>
                  <td className="py-4 text-right font-mono tabular-nums text-foreground whitespace-nowrap">
                    {pos.allocation_pct.toFixed(1)}%
                  </td>
                  <td className="py-4 text-muted-foreground max-w-[200px] truncate">
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
