import { getRiskAlerts, getPortfolio } from "@/lib/data";
import type { RiskAlert } from "@/lib/types";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";
import { formatUSD } from "@/lib/utils";

function AlertRow({ alert }: { alert: RiskAlert }) {
  const dotColor =
    alert.severity === "critical"
      ? "bg-moria-neg"
      : alert.severity === "warning"
      ? "bg-copper"
      : "bg-moria-light";

  const labelColor =
    alert.severity === "critical"
      ? "text-moria-neg"
      : alert.severity === "warning"
      ? "text-copper"
      : "text-moria-light";

  return (
    <div className="flex items-start gap-3 px-5 py-4 border-b border-moria-rule/30 last:border-b-0">
      <span className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className={`text-[9px] font-mono font-semibold uppercase tracking-widest ${labelColor}`}
          >
            {alert.severity}
          </span>
          <span className="text-moria-rule text-[9px]">·</span>
          <span className="text-[9px] font-mono uppercase tracking-wider text-moria-dim">
            {alert.type.replace(/_/g, " ")}
          </span>
          {alert.position && (
            <>
              <span className="text-moria-rule text-[9px]">·</span>
              <span className="font-mono text-[11px] text-moria-black">
                {alert.position}
              </span>
            </>
          )}
        </div>
        <p className="text-[13px] font-medium text-moria-black">{alert.title}</p>
        <p className="text-[12px] text-moria-dim mt-0.5">{alert.message}</p>
        {alert.metric && (
          <p className="font-mono text-[10px] text-moria-light mt-1">
            current {alert.metric.current.toFixed(2)} / threshold{" "}
            {alert.metric.threshold.toFixed(2)}
            {alert.metric.distance_pct !== undefined &&
              ` · ${alert.metric.distance_pct.toFixed(1)}% distance`}
          </p>
        )}
      </div>
    </div>
  );
}

export default function RiskPage() {
  const data = getRiskAlerts();
  const portfolio = getPortfolio();

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
            Balin — Risk Sentinel
          </p>
          <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-tight">
            Risk
          </h1>
          <p className="text-moria-dim text-sm mt-1">
            Live alerts from stop-loss monitoring, concentration limits, and wallet activity.
          </p>
        </div>

        {!data ? (
          <DataError
            title="No risk data"
            message="Run Balin to analyze risk: tsx daily-brief/analyze-risk.ts"
          />
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                  Critical
                </p>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-moria-neg" />
                  <p className="font-mono text-[24px] sm:text-[28px] tabular-nums leading-tight text-moria-black">
                    {data.summary.critical}
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                  Warning
                </p>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-copper" />
                  <p className="font-mono text-[24px] sm:text-[28px] tabular-nums leading-tight text-moria-black">
                    {data.summary.warning}
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                  Info
                </p>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-moria-light" />
                  <p className="font-mono text-[24px] sm:text-[28px] tabular-nums leading-tight text-moria-black">
                    {data.summary.info}
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                  Max Position
                </p>
                <p
                  className={`font-mono text-[24px] sm:text-[28px] tabular-nums leading-tight ${
                    data.concentration.breach ? "text-moria-neg" : "text-moria-black"
                  }`}
                >
                  {data.concentration.max_position_pct.toFixed(1)}%
                </p>
                <p className="text-[10px] text-moria-light mt-0.5">
                  {data.concentration.max_position} · limit {data.concentration.limit}%
                </p>
              </div>
            </div>

            {/* Active alerts */}
            {data.alerts.length > 0 ? (
              <div>
                <h2 className="text-[15px] font-semibold text-moria-black mb-4">
                  Active Alerts
                </h2>
                <div className="card overflow-hidden">
                  {data.alerts.map((alert) => (
                    <AlertRow key={alert.id} alert={alert} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="card p-5">
                <p className="text-[14px] text-moria-dim">
                  No active alerts. All positions within limits.
                </p>
              </div>
            )}

            {/* Wallet activity */}
            {data.wallet && (
              <div>
                <h2 className="text-[15px] font-semibold text-moria-black mb-4">
                  Wallet
                </h2>
                <div className="card p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                        Balance
                      </p>
                      <p className="font-mono text-[18px] tabular-nums text-moria-black">
                        {data.wallet.eth_balance.toFixed(4)} ETH
                      </p>
                      <p className="text-[11px] text-moria-dim font-mono">
                        {formatUSD(data.wallet.total_usd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                        24h Inflows
                      </p>
                      <p className="font-mono text-[18px] tabular-nums text-moria-pos">
                        {formatUSD(data.wallet.flow_24h.inflows_usd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                        24h Outflows
                      </p>
                      <p className="font-mono text-[18px] tabular-nums text-moria-neg">
                        {formatUSD(data.wallet.flow_24h.outflows_usd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                        Source
                      </p>
                      <p className="font-mono text-[13px] text-moria-dim">
                        {data.wallet.source}
                      </p>
                    </div>
                  </div>
                  {data.wallet.error && (
                    <p className="mt-4 pt-4 border-t border-moria-rule/30 text-[12px] text-copper">
                      {data.wallet.error} — add ETHERSCAN_API_KEY to unlock wallet flow detection
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Perp positions table */}
            {portfolio.perps.length > 0 && (
              <div>
                <h2 className="text-[15px] font-semibold text-moria-black mb-4">
                  Perp Positions
                </h2>
                <div className="card overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-t-2 border-copper bg-[#F5F4F2]">
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                          Pair
                        </th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                          Leverage
                        </th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                          Capital
                        </th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-moria-dim">
                          Stop Loss
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.perps.map((p) => (
                        <tr key={p.pair} className="border-b border-moria-rule/30">
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-moria-black">
                              {p.pair}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-moria-dim">
                            {p.leverage}x
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-moria-black">
                            {formatUSD(p.capital_usd)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-moria-neg">
                            ${p.stop.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
