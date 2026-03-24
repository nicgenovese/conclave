import { getRiskScores } from "@/lib/data";
import { riskBgColor } from "@/lib/utils";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";
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

  if (scores.length === 0) {
    return (
      <ErrorBoundary>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1">
            Risk Framework
          </h1>
          <p className="text-sm text-[hsl(215,20%,55%)] mb-6 sm:mb-8">
            Position-level risk scoring across five factors
          </p>
          <DataError
            title="No risk scores available"
            message="Run the daily brief to generate risk assessments for your positions."
          />
        </div>
      </ErrorBoundary>
    );
  }

  const greenCount = scores.filter((s) => s.status === "green").length;
  const amberCount = scores.filter((s) => s.status === "amber").length;
  const redCount = scores.filter((s) => s.status === "red").length;

  return (
    <ErrorBoundary>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Risk Framework</h1>
        <p className="text-sm text-[hsl(215,20%,55%)] mb-6 sm:mb-8">
          Position-level risk scoring across five factors
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
            <div>
              <span className="text-lg sm:text-2xl font-bold">
                {greenCount}
              </span>
              <span className="text-xs sm:text-sm text-[hsl(215,20%,55%)] ml-1 sm:ml-2 hidden sm:inline">
                Low Risk
              </span>
            </div>
          </div>
          <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
            <div>
              <span className="text-lg sm:text-2xl font-bold">
                {amberCount}
              </span>
              <span className="text-xs sm:text-sm text-[hsl(215,20%,55%)] ml-1 sm:ml-2 hidden sm:inline">
                Medium Risk
              </span>
            </div>
          </div>
          <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <span className="text-lg sm:text-2xl font-bold">{redCount}</span>
              <span className="text-xs sm:text-sm text-[hsl(215,20%,55%)] ml-1 sm:ml-2 hidden sm:inline">
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
              className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <span className="font-mono font-bold text-base sm:text-lg">
                    {pos.ticker}
                  </span>
                  <span className="text-sm text-[hsl(215,20%,55%)] ml-2 sm:ml-3">
                    {pos.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-mono">
                      {pos.overall}
                    </span>
                    <span className="text-sm text-[hsl(215,20%,55%)]">
                      /10
                    </span>
                  </div>
                  <span
                    className={`inline-block px-2 sm:px-2.5 py-1 rounded text-xs font-medium border ${riskBgColor(pos.status)}`}
                  >
                    {statusLabel(pos.status)}
                  </span>
                </div>
              </div>

              {/* Factor bars: stack on mobile, row on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
        <div className="mt-6 sm:mt-8 bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3">Risk Score Legend</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm text-[hsl(215,20%,55%)]">
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
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs text-[hsl(215,20%,55%)]">
            <span>Smart Contract</span>
            <span>Liquidity</span>
            <span>Concentration</span>
            <span>Market</span>
            <span>Governance</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
