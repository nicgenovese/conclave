import { getRiskScores } from "@/lib/data";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";
import type { RiskFactor } from "@/lib/types";

function factorBarColor(score: number): string {
  if (score <= 3) return "bg-emerald-500";
  if (score <= 6) return "bg-amber-500";
  return "bg-red-500";
}

function statusDotColor(status: "green" | "amber" | "red"): string {
  switch (status) {
    case "green":
      return "bg-emerald-500";
    case "amber":
      return "bg-amber-500";
    case "red":
      return "bg-red-500";
  }
}

function statusText(status: "green" | "amber" | "red"): string {
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
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Risk
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Position-level risk scoring across five factors
            </p>
          </div>
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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Risk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Position-level risk scoring across five factors
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <div>
              <span className="text-xl sm:text-2xl font-semibold font-mono tabular-nums">
                {greenCount}
              </span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                Low Risk
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
            <div>
              <span className="text-xl sm:text-2xl font-semibold font-mono tabular-nums">
                {amberCount}
              </span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                Medium Risk
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <span className="text-xl sm:text-2xl font-semibold font-mono tabular-nums">
                {redCount}
              </span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                High Risk
              </span>
            </div>
          </div>
        </div>

        {/* Risk table */}
        <div className="space-y-3">
          {scores.map((pos) => (
            <div
              key={pos.ticker}
              className="rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${statusDotColor(pos.status)}`}
                  />
                  <span className="font-mono font-medium text-base sm:text-lg tracking-tight">
                    {pos.ticker}
                  </span>
                  <span className="text-sm text-muted-foreground truncate">
                    {pos.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 flex-shrink-0">
                  <span className="text-2xl font-mono font-semibold tabular-nums">
                    {pos.overall}
                  </span>
                  <span className="text-sm text-muted-foreground">/10</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {statusText(pos.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {(
                  Object.entries(pos.factors) as [keyof RiskFactor, number][]
                ).map(([factor, score]) => (
                  <div key={factor}>
                    <div className="text-xs text-muted-foreground capitalize mb-1.5">
                      {factor.replace(/_/g, " ")}
                    </div>
                    <div className="h-1 rounded-full bg-secondary">
                      <div
                        className={`h-1 rounded-full ${factorBarColor(score)}`}
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs font-mono tabular-nums text-muted-foreground mt-1">
                      {score}/10
                    </div>
                  </div>
                ))}
              </div>

              {pos.notes && (
                <p className="text-sm text-muted-foreground mt-4 pt-3 border-t border-border/50">
                  {pos.notes}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Risk Score Legend
          </p>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 rounded-full bg-emerald-500" />
              <span>1-3 Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 rounded-full bg-amber-500" />
              <span>4-6 Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 rounded-full bg-red-500" />
              <span>7-10 High</span>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
