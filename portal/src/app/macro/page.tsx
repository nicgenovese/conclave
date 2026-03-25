import { getMacroData } from "@/lib/data";
import { formatNumber } from "@/lib/utils";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";

export default function MacroPage() {
  const data = getMacroData();

  return (
    <ErrorBoundary>
      <div>
        {/* Section Header */}
        <div className="section-header">
          <span className="section-number">04.</span>
          <h1 className="section-title">Market Intelligence</h1>
        </div>

        <p className="font-mono text-[12px] mb-8" style={{ color: "var(--light)" }}>
          Updated {data.updated_at}
        </p>

        {/* Prediction Markets */}
        <div className="mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] mb-5" style={{ color: "var(--copper)" }}>
            Prediction Markets
          </p>

          {data.polymarket.length === 0 ? (
            <DataError
              title="No prediction market data"
              message="Run the daily brief to populate this section."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="moria-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Category</th>
                    <th className="text-right">Probability</th>
                    <th className="text-right">Volume</th>
                    <th className="text-right">Ends</th>
                  </tr>
                </thead>
                <tbody>
                  {data.polymarket.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <span className="font-serif" style={{ color: "var(--black)" }}>
                          {event.question}
                        </span>
                        {event.outcomes.length > 1 && (
                          <div className="mt-2 space-y-1">
                            {event.outcomes.map((outcome) => (
                              <div key={outcome.name} className="flex items-center justify-between text-[12px]">
                                <span className="font-serif" style={{ color: "var(--dim)" }}>
                                  {outcome.name}
                                </span>
                                <span className="font-mono tabular-nums" style={{ color: "var(--black)" }}>
                                  {(outcome.probability * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-[11px] uppercase" style={{ color: "var(--light)" }}>
                          {event.category}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="font-mono tabular-nums" style={{ color: "var(--black)" }}>
                          {event.outcomes.length === 1
                            ? `${(event.outcomes[0].probability * 100).toFixed(0)}%`
                            : "\u2014"}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="font-mono tabular-nums text-[12px]" style={{ color: "var(--dim)" }}>
                          {formatNumber(event.volume_usd)}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="font-mono text-[12px]" style={{ color: "var(--light)" }}>
                          {event.end_date}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Signals / News */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] mb-5" style={{ color: "var(--copper)" }}>
            Signal Feed
          </p>

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
                  className="py-4"
                  style={{ borderBottom: i < data.signals.length - 1 ? "0.5px solid var(--rule)" : "none" }}
                >
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="font-mono text-[13px]" style={{ color: "var(--copper)" }}>
                      {String(i + 1).padStart(2, "0")}.
                    </span>
                    <span className="font-serif text-[14px] font-semibold" style={{ color: "var(--black)" }}>
                      {signal.account}
                    </span>
                    <span className="font-mono text-[11px]" style={{ color: "var(--light)" }}>
                      @{signal.handle}
                    </span>
                  </div>
                  <p className="font-serif text-[14px] leading-relaxed pl-7" style={{ color: "var(--dim)" }}>
                    {signal.text}
                  </p>
                  <p className="font-mono text-[11px] mt-2 pl-7" style={{ color: "var(--light)" }}>
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
