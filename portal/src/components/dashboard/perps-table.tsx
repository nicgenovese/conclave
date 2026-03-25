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
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] mb-5" style={{ color: "var(--copper)" }}>
        Perpetuals
      </p>

      {/* Summary stats row */}
      <div className="grid grid-cols-3 mb-6" style={{ borderTop: "0.5px solid var(--rule)" }}>
        <div className="py-4 px-4" style={{ borderRight: "0.5px solid var(--rule)", borderBottom: "0.5px solid var(--rule)" }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--copper)" }}>
            Total Exposure
          </p>
          <p className="font-mono text-[18px] tabular-nums mt-1" style={{ color: "var(--black)" }}>
            {formatUSD(totalExposure)}
          </p>
        </div>
        <div className="py-4 px-4" style={{ borderRight: "0.5px solid var(--rule)", borderBottom: "0.5px solid var(--rule)" }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--copper)" }}>
            Avg Leverage
          </p>
          <p className="font-mono text-[18px] tabular-nums mt-1" style={{ color: "var(--black)" }}>
            {avgLeverage.toFixed(1)}x
          </p>
        </div>
        <div className="py-4 px-4" style={{ borderBottom: "0.5px solid var(--rule)" }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--copper)" }}>
            Max Loss
          </p>
          <p className="font-mono text-[18px] tabular-nums mt-1" style={{ color: "var(--neg)" }}>
            {formatUSD(maxLoss)}
          </p>
        </div>
      </div>

      {/* Table */}
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
                  <span className="font-mono font-medium" style={{ color: "var(--black)" }}>
                    {perp.pair}
                  </span>
                </td>
                <td className="text-right">
                  <span className="font-mono" style={{ color: "var(--body)" }}>
                    {perp.leverage}x
                  </span>
                </td>
                <td className="text-right">
                  <span className="font-mono" style={{ color: "var(--black)" }}>
                    {formatUSD(perp.capital_usd)}
                  </span>
                </td>
                <td className="text-right">
                  <span className="font-mono" style={{ color: "var(--black)" }}>
                    {formatUSD(perp.entry_1)}
                  </span>
                </td>
                <td className="text-right">
                  <span className="font-mono" style={{ color: "var(--black)" }}>
                    {formatUSD(perp.entry_2)}
                  </span>
                </td>
                <td className="text-right">
                  <span className="font-mono" style={{ color: "var(--neg)" }}>
                    {formatUSD(perp.stop)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
