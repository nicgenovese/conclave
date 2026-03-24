import { getRiskScores } from "@/lib/data";
import { riskBgColor } from "@/lib/utils";
import type { RiskFactor } from "@/lib/types";

function factorBarColor(score: number): string {
  if (score <= 3) return "bg-emerald-500";
  if (score <= 6) return "bg-amber-500";
  return "bg-red-500";
}

function statusLabel(status: "green" | "amber" | "red"): string {
  switch (status) {
    case "green":
      return "Low";
    case "amber":
      return "Medium";
    case "red":
      return "High";
  }
}

export default function RiskPage() {
  const scores = getRiskScores();

  const greenCount = scores.filter((s) => s.status === "green").length;
  const amberCount = scores.filter((s) => s.status === "amber").length;
  const redCount = scores.filter((s) => s.status === "red").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Risk Framework</h1>
      <p className="text-sm text-[hsl(215,20%,55%)] mb-8">
        Position-level risk scoring across five factors
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <div>
            <span className="text-2xl font-bold">{greenCount}</span>
            <span className="text-sm text-[hsl(215,20%,55%)] ml-2">
              Low Risk
            </span>
          </div>
        </div>
        <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div>
            <span className="text-2xl font-bold">{amberCount}</span>
            <span className="text-sm text-[hsl(215,20%,55%)] ml-2">
              Medium Risk
            </span>
          </div>
        </div>
        <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div>
            <span className="text-2xl font-bold">{redCount}</span>
            <span className="text-sm text-[hsl(215,20%,55%)] ml-2">
              High Risk
            </span>
          </div>
        </div>
      </div>

      {/* Risk Table */}
      <div className="space-y-3">
        {scores.map((pos) => (
          <div
            key={pos.ticker}
            className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-mono font-bold text-lg">
                  {pos.ticker}
                </span>
                <span className="text-sm text-[hsl(215,20%,55%)] ml-3">
                  {pos.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-2xl font-mono">{pos.overall}</span>
                  <span className="text-sm text-[hsl(215,20%,55%)]">/10</span>
                </div>
                <span
                  className={`inline-block px-2.5 py-1 rounded text-xs font-medium border ${riskBgColor(pos.status)}`}
                >
                  {statusLabel(pos.status)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {(
                Object.entries(pos.factors) as [keyof RiskFactor, number][]
              ).map(([factor, score]) => (
                <div key={factor}>
                  <div className="text-xs text-[hsl(215,20%,55%)] capitalize mb-1">
                    {factor.replace(/_/g, " ")}
                  </div>
                  <div className="h-1.5 rounded-full bg-[hsl(215,20%,16%)]">
                    <div
                      className={`h-1.5 rounded-full ${factorBarColor(score)}`}
                      style={{ width: `${(score / 10) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-mono mt-0.5">{score}/10</div>
                </div>
              ))}
            </div>

            {pos.notes && (
              <p className="text-sm italic text-[hsl(215,20%,55%)] mt-3">
                {pos.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-3">Risk Score Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[hsl(215,20%,55%)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1.5 rounded-full bg-emerald-500" />
            <span>1-3: Low risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1.5 rounded-full bg-amber-500" />
            <span>4-6: Medium risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1.5 rounded-full bg-red-500" />
            <span>7-10: High risk</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-[hsl(215,20%,55%)]">
          <span>Smart Contract</span>
          <span>Liquidity</span>
          <span>Concentration</span>
          <span>Market</span>
          <span>Governance</span>
        </div>
      </div>
    </div>
  );
}
