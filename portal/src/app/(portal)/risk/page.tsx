import { getRiskScores } from "@/lib/data";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";
import type { RiskFactor } from "@/lib/types";

function factorBarColor(score: number): string {
  if (score <= 3) return "var(--pos)";
  if (score <= 6) return "var(--copper)";
  return "var(--neg)";
}

function statusText(status: "green" | "amber" | "red"): string {
  switch (status) {
    case "green": return "Low";
    case "amber": return "Medium";
    case "red": return "High";
  }
}

function statusDotColor(status: "green" | "amber" | "red"): string {
  switch (status) {
    case "green": return "var(--pos)";
    case "amber": return "var(--copper)";
    case "red": return "var(--neg)";
  }
}

export default function RiskPage() {
  const scores = getRiskScores();

  if (scores.length === 0) {
    return (
      <ErrorBoundary>
        <div>
          <h2 className="text-[20px] font-semibold text-moria-black mb-2">Risk</h2>
          <p className="text-[14px] mb-8 text-moria-dim">
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
        {/* Section Header */}
        <h2 className="text-[20px] font-semibold text-moria-black mb-2">Risk</h2>

        <p className="text-[14px] mb-8 text-moria-dim">
          Position-level risk scoring across five factors
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="stat-card">
            <p className="text-copper text-[11px] font-medium uppercase tracking-wide">
              Low Risk
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-moria-pos" />
              <span className="font-mono text-[24px] tabular-nums text-moria-black">
                {greenCount}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <p className="text-copper text-[11px] font-medium uppercase tracking-wide">
              Medium Risk
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-copper" />
              <span className="font-mono text-[24px] tabular-nums text-moria-black">
                {amberCount}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <p className="text-copper text-[11px] font-medium uppercase tracking-wide">
              High Risk
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-moria-neg" />
              <span className="font-mono text-[24px] tabular-nums text-moria-black">
                {redCount}
              </span>
            </div>
          </div>
        </div>

        {/* Factor table per position */}
        <div className="card overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="moria-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th className="text-right">Overall</th>
                  <th>Status</th>
                  <th className="text-right">Smart Contract</th>
                  <th className="text-right">Market</th>
                  <th className="text-right">Liquidity</th>
                  <th className="text-right">Governance</th>
                  <th className="text-right">Counterparty</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((pos) => (
                  <tr key={pos.ticker}>
                    <td>
                      <span className="font-mono font-medium text-moria-black">
                        {pos.ticker}
                      </span>
                      <span className="block text-[12px] text-moria-dim">
                        {pos.name}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="font-mono text-[18px] tabular-nums text-moria-black">
                        {pos.overall}
                      </span>
                      <span className="font-mono text-[12px] text-moria-light">/10</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: statusDotColor(pos.status) }}
                        />
                        <span className="text-[13px] text-moria-dim">
                          {statusText(pos.status)}
                        </span>
                      </div>
                    </td>
                    {(Object.entries(pos.factors) as [keyof RiskFactor, number][]).map(
                      ([factor, score]) => (
                        <td key={factor} className="text-right">
                          <span className="font-mono tabular-nums text-[13px] text-moria-dim">
                            {score}
                          </span>
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk bars per position */}
        <div className="space-y-6">
          {scores.map((pos) => (
            <div key={pos.ticker + "-bars"} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: statusDotColor(pos.status) }}
                />
                <span className="font-mono text-[13px] font-medium text-moria-black">
                  {pos.ticker}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {(Object.entries(pos.factors) as [keyof RiskFactor, number][]).map(
                  ([factor, score]) => (
                    <div key={factor}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.06em] mb-1.5 text-moria-light">
                        {String(factor).replace(/_/g, " ")}
                      </div>
                      <div className="h-1 w-full rounded-full bg-moria-faint">
                        <div
                          className="h-1 rounded-full"
                          style={{
                            width: `${(score / 10) * 100}%`,
                            background: factorBarColor(score),
                          }}
                        />
                      </div>
                      <div className="font-mono text-[11px] tabular-nums mt-1 text-moria-dim">
                        {score}/10
                      </div>
                    </div>
                  )
                )}
              </div>

              {pos.notes && (
                <p className="font-serif text-[13px] mt-3 pt-3 border-t border-moria-rule text-moria-dim">
                  {pos.notes}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-10 flex flex-wrap gap-6 text-[12px]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 rounded-full bg-moria-pos" />
            <span className="text-moria-dim">1-3 Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 rounded-full bg-copper" />
            <span className="text-moria-dim">4-6 Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 rounded-full bg-moria-neg" />
            <span className="text-moria-dim">7-10 High</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
