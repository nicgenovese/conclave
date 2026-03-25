import { Position } from "@/lib/types";
import { formatUSD } from "@/lib/utils";

interface PositionsTableProps {
  positions: Position[];
}

export default function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] mb-5" style={{ color: "var(--copper)" }}>
        Spot Positions
      </p>

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
                  <span className="font-mono font-medium" style={{ color: "var(--black)" }}>
                    {pos.ticker}
                  </span>
                  <span className="block text-[12px] font-serif mt-0.5" style={{ color: "var(--dim)" }}>
                    {pos.name}
                  </span>
                </td>
                <td className="font-serif" style={{ color: "var(--dim)" }}>
                  {pos.bucket}
                </td>
                <td className="text-right mono-cell">
                  <span className="font-mono" style={{ color: "var(--black)" }}>
                    {formatUSD(pos.allocation_usd)}
                  </span>
                </td>
                <td className="text-right mono-cell">
                  <span className="font-mono" style={{ color: "var(--black)" }}>
                    {pos.allocation_pct.toFixed(1)}%
                  </span>
                </td>
                <td style={{ color: "var(--dim)", maxWidth: "200px" }} className="truncate">
                  {pos.notes || "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
