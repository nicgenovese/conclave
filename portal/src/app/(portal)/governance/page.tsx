import { getGovernance } from "@/lib/data";
import { DataError } from "@/components/data-error";
import type { GovernanceAlert } from "@/lib/types";

// ─────────────────────────────────────────────
// /governance — narrowed to fee-switch-relevant proposals only.
// Everything else is noise. If a proposal isn't about money flowing
// to token holders, we don't surface it here.
// ─────────────────────────────────────────────

const FEE_SWITCH_KEYWORDS = [
  "fee switch",
  "fee share",
  "revenue share",
  "revenue distribution",
  "token buyback",
  "buyback",
  "distribute fees",
  "turn on fees",
  "activate fees",
  "staking rewards",
  "stake rewards",
  "fees to holders",
  "fees to stakers",
  "treasury distribution",
  "revenue allocation",
  "protocol revenue",
  "sgov",
  "seigniorage",
];

function isFeeSwitchProposal(alert: GovernanceAlert): boolean {
  const text = `${alert.title} ${alert.body || ""}`.toLowerCase();
  return FEE_SWITCH_KEYWORDS.some((kw) => text.includes(kw));
}

function daysUntil(iso: string): { days: number | null; label: string; urgent: boolean } {
  try {
    const diff = new Date(iso).getTime() - Date.now();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { days, label: "ended", urgent: false };
    if (days === 0) return { days, label: "today", urgent: true };
    if (days <= 3) return { days, label: `${days}d`, urgent: true };
    return { days, label: `${days}d`, urgent: false };
  } catch {
    return { days: null, label: "—", urgent: false };
  }
}

function FeeSwitchCard({ alert }: { alert: GovernanceAlert }) {
  const { label, urgent } = daysUntil(alert.voting_ends);
  const forPct = alert.current_result.for;
  const againstPct = alert.current_result.against;

  return (
    <a
      href={alert.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block card p-5 hover:shadow-card-hover transition-shadow relative overflow-hidden group"
    >
      {/* Urgent accent */}
      {urgent && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-moria-neg" />
      )}

      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-medium text-copper text-[12px]">{alert.protocol}</span>
          <span className="px-1.5 py-0.5 bg-copper/10 text-copper text-[9px] font-mono font-semibold rounded tracking-wider">
            FEE SWITCH
          </span>
          {urgent && (
            <span className="px-1.5 py-0.5 bg-moria-neg text-white text-[9px] font-mono font-medium rounded tracking-wider animate-pulse">
              URGENT
            </span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p
            className={`font-mono text-[16px] font-semibold tabular-nums leading-none ${
              urgent ? "text-moria-neg" : "text-moria-body"
            }`}
          >
            {label}
          </p>
        </div>
      </div>

      <h3 className="font-serif text-[16px] text-moria-black leading-snug mb-2 group-hover:text-copper transition-colors line-clamp-3">
        {alert.title}
      </h3>

      {alert.ai_summary && (
        <p className="text-[12px] text-moria-dim italic mb-3 line-clamp-2">{alert.ai_summary}</p>
      )}

      {/* For/Against bar */}
      <div className="mt-4 pt-3 border-t border-moria-rule/40">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="font-mono text-[10px] text-moria-pos tabular-nums w-14">
            For {forPct.toFixed(0)}%
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-moria-faint overflow-hidden flex">
            <div className="h-full bg-moria-pos" style={{ width: `${forPct}%` }} />
            <div className="h-full bg-moria-neg" style={{ width: `${againstPct}%` }} />
          </div>
          <span className="font-mono text-[10px] text-moria-neg tabular-nums w-16 text-right">
            Against {againstPct.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono text-moria-light">
          <span>{alert.scores_total.toFixed(0)} votes</span>
          {alert.current_result.quorum_met && (
            <span className="text-moria-pos">· Quorum met</span>
          )}
          {!alert.current_result.quorum_met && (
            <span className="text-copper">· Quorum not met</span>
          )}
        </div>
      </div>
    </a>
  );
}

export default function GovernancePage() {
  const governance = getGovernance();

  if (!governance) {
    return (
      <DataError
        title="No governance data"
        message="Run the Snapshot fetcher to populate governance proposals."
      />
    );
  }

  const feeSwitchActive = governance.active.filter(isFeeSwitchProposal);
  const feeSwitchClosed = governance.recent_closed.filter(isFeeSwitchProposal);
  const otherCount = governance.active.length - feeSwitchActive.length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
          Thorin · Catalyst Scanner
        </p>
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-tight">
          Governance
        </h1>
        <p className="text-[13px] text-moria-dim mt-1">
          Fee switches, revenue shares, token buybacks. The proposals that actually
          move tokens. {otherCount > 0 && `(${otherCount} other proposals hidden.)`}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card p-5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
            Active catalysts
          </p>
          <p className="font-mono text-[24px] tabular-nums text-copper leading-tight">
            {feeSwitchActive.length}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
            Urgent (≤3d)
          </p>
          <p className="font-mono text-[24px] tabular-nums text-moria-neg leading-tight">
            {
              feeSwitchActive.filter((a) => {
                const { days } = daysUntil(a.voting_ends);
                return days !== null && days >= 0 && days <= 3;
              }).length
            }
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
            Recently closed
          </p>
          <p className="font-mono text-[24px] tabular-nums text-moria-dim leading-tight">
            {feeSwitchClosed.length}
          </p>
        </div>
      </div>

      {/* Active fee-switch proposals */}
      <section>
        <div className="flex items-center gap-2.5 mb-3">
          <h2 className="text-[15px] font-semibold text-moria-black">Active Votes</h2>
          <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
            Live
          </span>
        </div>
        {feeSwitchActive.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-[13px] text-moria-light italic">
              No active fee-switch proposals right now. Thorin watches Snapshot every 12h — when
              a fee-share or revenue proposal goes live, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feeSwitchActive.map((alert) => (
              <FeeSwitchCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>

      {/* Recently closed fee-switch proposals */}
      {feeSwitchClosed.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold text-moria-black mb-3">Recently closed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feeSwitchClosed.slice(0, 6).map((alert) => (
              <FeeSwitchCard key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
