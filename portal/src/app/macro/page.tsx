import { getMacroData } from "@/lib/data";
import { formatNumber } from "@/lib/utils";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";

const categoryDotColor: Record<string, string> = {
  protocol: "bg-blue-500",
  analyst: "bg-violet-500",
  macro: "bg-amber-500",
  "on-chain": "bg-emerald-500",
};

export default function MacroPage() {
  const data = getMacroData();

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Market Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Updated {data.updated_at}
          </p>
        </div>

        {/* Prediction Markets */}
        <div>
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-4">
            Prediction Markets
          </h2>

          {data.polymarket.length === 0 ? (
            <DataError
              title="No prediction market data"
              message="Run the daily brief to populate this section."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.polymarket.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-border bg-card p-5 sm:p-6"
                >
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium bg-secondary text-muted-foreground">
                    {event.category}
                  </span>
                  <p className="font-medium text-sm sm:text-base mt-3 leading-snug">
                    {event.question}
                  </p>

                  <div className="mt-4 space-y-3">
                    {event.outcomes.map((outcome) => (
                      <div key={outcome.name}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground truncate mr-3">
                            {outcome.name}
                          </span>
                          <span className="font-mono tabular-nums text-foreground flex-shrink-0">
                            {(outcome.probability * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-secondary w-full">
                          <div
                            className={`h-1 rounded-full transition-all ${
                              outcome.probability > 0.5
                                ? "bg-emerald-500/70"
                                : "bg-muted-foreground/30"
                            }`}
                            style={{ width: `${outcome.probability * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
                    <span>Vol {formatNumber(event.volume_usd)}</span>
                    <span>Ends {event.end_date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Signals */}
        <div>
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-4">
            Signal Feed
          </h2>

          {data.signals.length === 0 ? (
            <DataError
              title="No signals available"
              message="Signals will appear here after the daily brief runs."
            />
          ) : (
            <div>
              {data.signals.map((signal, i) => (
                <div
                  key={i}
                  className={`py-4 ${i < data.signals.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium">{signal.account}</span>
                    <span className="text-xs text-muted-foreground">
                      @{signal.handle}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        categoryDotColor[signal.category] || "bg-zinc-500"
                      }`}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {signal.text}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {signal.timestamp}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
