import { Position } from "@/lib/types";
import { formatUSD } from "@/lib/utils";

interface PositionsTableProps {
  positions: Position[];
}

export default function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <div>
      <p className="text-copper text-[11px] font-medium uppercase tracking-wide mb-4">
        Spot Positions
      </p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="moria-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Bucket</th>
                <th className="text-right">Allocation</th>
                <th className="text-right">Weight</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => (
                <tr key={`${pos.ticker}-${i}`}>
                  <td>
                    <span className="font-mono font-medium text-moria-black">
                      {pos.ticker}
                    </span>
                    <span className="block text-[12px] mt-0.5 text-moria-dim">
                      {pos.name}
                    </span>
                  </td>
                  <td className="text-moria-dim">
                    {pos.bucket}
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-moria-black">
                      {formatUSD(pos.allocation_usd)}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-moria-black">
                      {pos.allocation_pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-moria-dim max-w-[200px] truncate">
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
