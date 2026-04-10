import { getGovernance } from "@/lib/data";
import type { GovernanceAlert } from "@/lib/types";
import { DataError } from "@/components/data-error";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string): string {
  try {
    const diff = new Date(iso).getTime() - Date.now();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return "ended";
    if (days === 0) return "ends today";
    if (days === 1) return "1 day left";
    return `${days} days left`;
  } catch {
    return "";
  }
}

function RelevanceBadge({ relevance }: { relevance: "high" | "medium" | "low" }) {
  const config = {
    high: { bg: "bg-copper", text: "text-white", label: "HIGH" },
    medium: { bg: "bg-moria-rule", text: "text-moria-black", label: "MED" },
    low: { bg: "bg-moria-faint", text: "text-moria-light", label: "LOW" },
  }[relevance];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-medium tracking-wider ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

function ProposalCard({ alert }: { alert: GovernanceAlert }) {
  const { current_result } = alert;
  const isActive = alert.status === "active";

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-medium text-copper text-[12px]">
            {alert.protocol}
          </span>
          <span className="text-moria-rule text-[11px]">·</span>
          <span className="text-[11px] text-moria-light">{alert.space_label}</span>
          <RelevanceBadge relevance={alert.relevance} />
        </div>
        {isActive && (
          <span className="font-mono text-[10px] text-moria-dim whitespace-nowrap">
            {daysUntil(alert.voting_ends)}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-serif text-[16px] font-bold text-moria-black leading-snug mb-2">
        <a
          href={alert.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-copper transition-colors"
        >
          {alert.title}
        </a>
      </h3>

      {/* Impact */}
      {alert.impact && (
        <p className="text-[12px] text-moria-dim italic mb-3">{alert.impact}</p>
      )}

      {/* Vote bar */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
          <span className="text-moria-pos font-medium w-16">
            For {current_result.for.toFixed(1)}%
          </span>
          <div className="flex-1 h-1.5 bg-moria-faint rounded-full overflow-hidden flex">
            <div
              className="bg-moria-pos h-full"
              style={{ width: `${current_result.for}%` }}
            />
            <div
              className="bg-moria-neg h-full"
              style={{ width: `${current_result.against}%` }}
            />
          </div>
          <span className="text-moria-neg font-medium w-20 text-right">
            Against {current_result.against.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-moria-light">
          <span>
            Quorum:{" "}
            {current_result.quorum_met ? (
              <span className="text-moria-pos">met</span>
            ) : (
              <span className="text-moria-dim">not met</span>
            )}
          </span>
          <span>Ends {formatDate(alert.voting_ends)}</span>
        </div>
      </div>
    </div>
  );
}

export default function GovernancePage() {
  const governance = getGovernance();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
          Thorin — Protocol Watcher
        </p>
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-tight">
          Governance
        </h1>
        <p className="text-moria-dim text-sm mt-1">
          Active DAO proposals across Aave, Uniswap, Morpho, Pendle, Lido, and ENS
        </p>
      </div>

      {!governance ? (
        <DataError
          title="No governance data"
          message="Run Thorin to fetch governance proposals from Snapshot."
        />
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card">
              <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                Active
              </p>
              <p className="font-mono text-[24px] sm:text-[28px] font-normal tabular-nums text-moria-black leading-tight">
                {governance.summary.active_count}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                High Relevance
              </p>
              <p className="font-mono text-[24px] sm:text-[28px] font-normal tabular-nums text-copper leading-tight">
                {governance.summary.high_relevance}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                Protocols
              </p>
              <p className="font-mono text-[24px] sm:text-[28px] font-normal tabular-nums text-moria-black leading-tight">
                {governance.summary.protocols_with_activity.length}
              </p>
            </div>
          </div>

          {/* Active Proposals */}
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">
              Active Proposals
            </h2>
            {governance.active.length === 0 ? (
              <p className="text-moria-light text-sm">
                No active governance proposals right now.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {governance.active.map((alert) => (
                  <ProposalCard key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </div>

          {/* Recently Closed */}
          {governance.recent_closed.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold text-moria-black mb-4">
                Recently Closed
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {governance.recent_closed.slice(0, 6).map((alert) => (
                  <ProposalCard key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
