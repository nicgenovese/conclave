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
          <div className="section-header">
            <span className="section-number">05.</span>
            <h1 className="section-title">Risk</h1>
          </div>
          <p className="font-serif text-[14px] mb-8" style={{ color: "var(--dim)" }}>
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
        <div className="section-header">
          <span className="section-number">05.</span>
          <h1 className="section-title">Risk</h1>
        </div>

        <p className="font-serif text-[14px] mb-8" style={{ color: "var(--dim)" }}>
          Position-level risk scoring across five factors
        </p>

        {/* Summary: three labeled values */}
        <div className="grid grid-cols-3 mb-10" style={{ borderTop: "0.5px solid var(--rule)" }}>
          <div className="py-4 px-4" style={{ borderRight: "0.5px solid var(--rule)", borderBottom: "0.5px solid var(--rule)" }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--copper)" }}>
              Low Risk
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--pos)" }} />
              <span className="font-mono text-[24px] tabular-nums" style={{ color: "var(--black)" }}>
                {greenCount}
              </span>
            </div>
          </div>
          <div className="py-4 px-4" style={{ borderRight: "0.5px solid var(--rule)", borderBottom: "0.5px solid var(--rule)" }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--copper)" }}>
              Medium Risk
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--copper)" }} />
              <span className="font-mono text-[24px] tabular-nums" style={{ color: "var(--black)" }}>
                {amberCount}
              </span>
            </div>
          </div>
          <div className="py-4 px-4" style={{ borderBottom: "0.5px solid var(--rule)" }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--copper)" }}>
              High Risk
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--neg)" }} />
              <span className="font-mono text-[24px] tabular-nums" style={{ color: "var(--black)" }}>
                {redCount}
              </span>
            </div>
          </div>
        </div>

        {/* Factor table per position */}
        <div className="overflow-x-auto mb-10">
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
                    <span className="font-mono font-medium" style={{ color: "var(--black)" }}>
                      {pos.ticker}
                    </span>
                    <span className="block text-[12px] font-serif" style={{ color: "var(--dim)" }}>
                      {pos.name}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-[18px] tabular-nums" style={{ color: "var(--black)" }}>
                      {pos.overall}
                    </span>
                    <span className="font-mono text-[12px]" style={{ color: "var(--light)" }}>/10</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: statusDotColor(pos.status) }} />
                      <span className="font-serif text-[13px]" style={{ color: "var(--dim)" }}>
                        {statusText(pos.status)}
                      </span>
                    </div>
                  </td>
                  {(Object.entries(pos.factors) as [keyof RiskFactor, number][]).map(
                    ([factor, score]) => (
                      <td key={factor} className="text-right">
                        <span className="font-mono tabular-nums text-[13px]" style={{ color: "var(--body)" }}>
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

        {/* Risk bars per position */}
        <div className="space-y-6">
          {scores.map((pos) => (
            <div key={pos.ticker + "-bars"}>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: statusDotColor(pos.status) }} />
                <span className="font-mono text-[13px] font-medium" style={{ color: "var(--black)" }}>
                  {pos.ticker}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {(Object.entries(pos.factors) as [keyof RiskFactor, number][]).map(
                  ([factor, score]) => (
                    <div key={factor}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.06em] mb-1.5" style={{ color: "var(--light)" }}>
                        {String(factor).replace(/_/g, " ")}
                      </div>
                      <div className="h-[2px] w-full" style={{ background: "var(--faint)" }}>
                        <div
                          className="h-[2px]"
                          style={{
                            width: `${(score / 10) * 100}%`,
                            background: factorBarColor(score),
                          }}
                        />
                      </div>
                      <div className="font-mono text-[11px] tabular-nums mt-1" style={{ color: "var(--dim)" }}>
                        {score}/10
                      </div>
                    </div>
                  )
                )}
              </div>

              {pos.notes && (
                <p className="font-serif text-[13px] mt-3 pt-3" style={{ color: "var(--dim)", borderTop: "0.5px solid var(--rule)" }}>
                  {pos.notes}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <hr className="hairline mt-10 mb-4" />
        <div className="flex flex-wrap gap-6 text-[12px]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px]" style={{ background: "var(--pos)" }} />
            <span className="font-serif" style={{ color: "var(--dim)" }}>1-3 Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px]" style={{ background: "var(--copper)" }} />
            <span className="font-serif" style={{ color: "var(--dim)" }}>4-6 Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px]" style={{ background: "var(--neg)" }} />
            <span className="font-serif" style={{ color: "var(--dim)" }}>7-10 High</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
