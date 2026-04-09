import { getMacroData, getHeadlines } from "@/lib/data";
import { formatNumber } from "@/lib/utils";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";
import type { PolymarketEvent } from "@/lib/types";

export default function MacroPage() {
  const data = getMacroData();
  const headlinesData = getHeadlines();

  // Prefer headlines.json polymarket data; fall back to macro.json
  const polymarket: PolymarketEvent[] = headlinesData?.polymarket ?? data.polymarket;
  const polymarketUpdated = headlinesData?.updated_at ?? data.updated_at;

  return (
    <ErrorBoundary>
      <div>
        {/* Section Header */}
        <h2 className="text-[20px] font-semibold text-moria-black mb-2">Market Intelligence</h2>

        <p className="font-mono text-[12px] mb-8 text-moria-light">
          Updated {data.updated_at}
        </p>

        {/* Prediction Markets */}
        <div className="mb-12">
          <p className="text-copper text-[11px] font-medium uppercase tracking-wide mb-1">
            Prediction Markets
          </p>
          <p className="font-mono text-[10px] mb-5 text-moria-light">
            via headlines.json &middot; {polymarketUpdated}
          </p>

          {polymarket.length === 0 ? (
            <DataError
              title="No prediction market data"
              message="Run the daily brief to populate this section."
            />
          ) : (
            <div className="card overflow-hidden">
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
                    {polymarket.map((event, idx) => (
                      <tr key={event.id || idx}>
                        <td>
                          <span className="font-serif text-moria-black">
                            {event.question}
                          </span>
                          {event.outcomes && event.outcomes.length > 1 && (
                            <div className="mt-2 space-y-1">
                              {event.outcomes.map((outcome) => (
                                <div key={outcome.name} className="flex items-center justify-between text-[12px]">
                                  <span className="font-serif text-moria-dim">
                                    {outcome.name}
                                  </span>
                                  <span className="font-mono tabular-nums text-moria-black">
                                    {(outcome.probability * 100).toFixed(0)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="font-mono text-[11px] uppercase text-moria-light">
                            {event.category}
                          </span>
                        </td>
                        <td className="text-right">
                          <span className="font-mono tabular-nums text-moria-black">
                            {event.outcomes && event.outcomes.length === 1
                              ? `${(event.outcomes[0].probability * 100).toFixed(0)}%`
                              : "\u2014"}
                          </span>
                        </td>
                        <td className="text-right">
                          <span className="font-mono tabular-nums text-[12px] text-moria-dim">
                            {formatNumber(event.volume_usd)}
                          </span>
                        </td>
                        <td className="text-right">
                          <span className="font-mono text-[12px] text-moria-light">
                            {event.end_date}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Signals / News */}
        <div>
          <p className="text-copper text-[11px] font-medium uppercase tracking-wide mb-5">
            Signal Feed
          </p>

          {data.signals.length === 0 ? (
            <DataError
              title="No signals available"
              message="Signals will appear here after the daily brief runs."
            />
          ) : (
            <div className="space-y-4">
              {data.signals.map((signal, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="font-serif text-[14px] font-semibold text-moria-black">
                      {signal.account}
                    </span>
                    <span className="font-mono text-[11px] text-moria-light">
                      @{signal.handle}
                    </span>
                  </div>
                  <p className="font-serif text-[14px] leading-relaxed text-moria-dim">
                    {signal.text}
                  </p>
                  <p className="font-mono text-[11px] mt-2 text-moria-light">
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
