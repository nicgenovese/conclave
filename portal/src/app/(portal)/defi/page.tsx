import { getOri, getGimli, getGovernance } from "@/lib/data";
import { ErrorBoundary } from "@/components/error-boundary";
import { formatUSD } from "@/lib/utils";
import type { GimliProtocol, OriPosition, OriPerp } from "@/lib/types";

// ─────────────────────────────────────────────
// /defi — The real meat for a DeFi fund
// Answers the only question that matters: "what should I buy, sell, or hold today?"
// ─────────────────────────────────────────────

// Fee switch keywords — any proposal mentioning these is a CATALYST
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
];

function isFeeSwitchProposal(title: string, body?: string): boolean {
  const text = `${title} ${body || ""}`.toLowerCase();
  return FEE_SWITCH_KEYWORDS.some((kw) => text.includes(kw));
}

function daysUntil(iso: string): number | null {
  try {
    const d = new Date(iso);
    return Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Position Health Light
// Green: thesis intact · Amber: watch · Red: act
// ─────────────────────────────────────────────
function positionHealth(
  pos: OriPosition,
): { color: "green" | "amber" | "red"; reason: string } {
  // Red conditions
  if (pos.allocation_pct !== null && pos.allocation_pct > 30) {
    return { color: "red", reason: `concentration ${pos.allocation_pct.toFixed(0)}%` };
  }
  if (pos.source === "none") {
    return { color: "amber", reason: "no live data" };
  }

  // Amber conditions
  if (pos.allocation_pct !== null && pos.allocation_pct > 20) {
    return { color: "amber", reason: `${pos.allocation_pct.toFixed(0)}% of book` };
  }

  // Green — thesis intact
  return { color: "green", reason: "OK" };
}

export default function DeFiPage() {
  const ori = getOri();
  const gimli = getGimli();
  const governance = getGovernance();

  const positions = ori?.positions ?? [];
  const perps = ori?.perps ?? [];
  const nav = ori?.nav_usd ?? 0;
  const maxConcentration = ori?.concentration.max_position_pct ?? 0;

  // ─────────────────────────────────────────────
  // Protocols: split into "owned" vs "watchlist"
  // ─────────────────────────────────────────────
  const allProtocols = gimli?.protocols ?? [];
  const ownedTickers = new Set(positions.map((p) => p.ticker.toUpperCase()));
  const ownedProtocols = allProtocols.filter((p) => ownedTickers.has(p.ticker.toUpperCase()));
  const watchlistProtocols = allProtocols
    .filter((p) => !ownedTickers.has(p.ticker.toUpperCase()))
    .sort((a, b) => (a.pe_ratio ?? 999) - (b.pe_ratio ?? 999)); // cheap first

  // ─────────────────────────────────────────────
  // Fee switch calendar — pull from active governance
  // ─────────────────────────────────────────────
  const feeSwitchProposals = (governance?.active ?? [])
    .filter((p) => isFeeSwitchProposal(p.title, p.body))
    .sort((a, b) => {
      const da = daysUntil(a.voting_ends) ?? 999;
      const db = daysUntil(b.voting_ends) ?? 999;
      return da - db;
    });

  return (
    <ErrorBoundary>
      <div className="space-y-10">
        {/* Header */}
        <div>
          <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
            The Book
          </p>
          <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-tight">
            DeFi
          </h1>
          <p className="text-[13px] text-moria-dim mt-1">
            Portfolio, watchlist, and catalysts. Buy, sell, or hold — answered.
          </p>
        </div>

        {/* ═══════════════════════════════════════
            KPI STRIP
            ═══════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
              NAV
            </p>
            <p className="font-mono text-[24px] tabular-nums text-moria-black leading-tight">
              {formatUSD(nav)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
              Positions
            </p>
            <p className="font-mono text-[24px] tabular-nums text-moria-black leading-tight">
              {positions.length}
            </p>
            <p className="text-[10px] text-moria-dim mt-0.5">
              {perps.length} perps
            </p>
          </div>
          <div className="card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
              Max Concentration
            </p>
            <p
              className={`font-mono text-[24px] tabular-nums leading-tight ${
                maxConcentration > 30 ? "text-moria-neg" : "text-moria-black"
              }`}
            >
              {maxConcentration.toFixed(1)}%
            </p>
            <p className="text-[10px] text-moria-dim mt-0.5">
              limit 30%
            </p>
          </div>
          <div className="card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
              Fee-Switch Catalysts
            </p>
            <p className="font-mono text-[24px] tabular-nums text-copper leading-tight">
              {feeSwitchProposals.length}
            </p>
            <p className="text-[10px] text-moria-dim mt-0.5">next 30d</p>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            FEE SWITCH CATALYST CALENDAR
            ═══════════════════════════════════════ */}
        {feeSwitchProposals.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <h2 className="text-[15px] font-semibold text-moria-black">Fee Switch Calendar</h2>
              <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                Thorin · Catalysts
              </span>
            </div>
            <div className="card overflow-hidden">
              <div className="px-5 pt-4 pb-3 bg-moria-faint/30 border-b border-moria-rule/40">
                <p className="text-[11px] text-moria-dim">
                  Proposals that could redirect fees to token holders. These are the biggest
                  catalysts in DeFi — a single fee switch can re-rate a token 2-5x overnight.
                </p>
              </div>
              <div className="divide-y divide-moria-rule/30">
                {feeSwitchProposals.map((p) => {
                  const days = daysUntil(p.voting_ends);
                  const urgent = days !== null && days <= 7;
                  return (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-5 py-4 hover:bg-moria-faint/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 text-center w-16">
                          <div
                            className={`font-mono text-[18px] font-semibold tabular-nums leading-none ${
                              urgent ? "text-moria-neg" : "text-copper"
                            }`}
                          >
                            {days !== null && days > 0 ? `${days}d` : days === 0 ? "TODAY" : "—"}
                          </div>
                          <div className="text-[9px] font-mono text-moria-light uppercase tracking-wider mt-1">
                            to vote
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-medium text-copper text-[11px]">
                              {p.protocol}
                            </span>
                            {urgent && (
                              <span className="px-1.5 py-0.5 bg-moria-neg text-white text-[9px] font-mono font-medium rounded tracking-wider animate-pulse">
                                URGENT
                              </span>
                            )}
                          </div>
                          <p className="font-serif text-[14px] text-moria-black leading-snug line-clamp-2">
                            {p.title}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-[10px] font-mono">
                            <span className="text-moria-pos">
                              For {p.current_result.for.toFixed(0)}%
                            </span>
                            <span className="text-moria-neg">
                              Against {p.current_result.against.toFixed(0)}%
                            </span>
                            {p.current_result.quorum_met && (
                              <span className="text-moria-pos">· Quorum met</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            PORTFOLIO POSITIONS — live P/E + health lights
            ═══════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <h2 className="text-[15px] font-semibold text-moria-black">Portfolio</h2>
            <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
              Ori · Live
            </span>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-[12px] sm:text-[13px]">
              <thead>
                <tr className="border-b border-copper bg-[#F5F4F2]">
                  <th className="text-left px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                    Asset
                  </th>
                  <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                    Value
                  </th>
                  <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim hidden sm:table-cell">
                    Alloc
                  </th>
                  <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim hidden md:table-cell">
                    P/E
                  </th>
                  <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim hidden lg:table-cell">
                    Valuation
                  </th>
                  <th className="text-center px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                    Health
                  </th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const protocol = ownedProtocols.find(
                    (p) => p.ticker.toUpperCase() === pos.ticker.toUpperCase(),
                  );
                  const health = positionHealth(pos);
                  return (
                    <tr
                      key={`${pos.ticker}-${pos.chain}`}
                      className="border-b border-moria-rule/30 hover:bg-moria-faint/30 transition-colors"
                    >
                      <td className="px-3 sm:px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-moria-black">
                            {pos.ticker}
                          </span>
                          <span className="text-[10px] text-moria-light hidden sm:inline">
                            {pos.theme}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right font-mono tabular-nums text-moria-black">
                        {pos.value_usd !== null ? formatUSD(pos.value_usd) : "—"}
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1 bg-moria-faint rounded-full overflow-hidden">
                            <div
                              className="h-full bg-copper rounded-full"
                              style={{
                                width: `${Math.min(pos.allocation_pct ?? 0, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-xs tabular-nums text-moria-dim w-10 text-right">
                            {pos.allocation_pct !== null
                              ? `${pos.allocation_pct.toFixed(1)}%`
                              : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right font-mono tabular-nums text-moria-body hidden md:table-cell">
                        {protocol?.pe_ratio !== null && protocol?.pe_ratio !== undefined
                          ? `${protocol.pe_ratio.toFixed(1)}x`
                          : "—"}
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right hidden lg:table-cell">
                        {protocol?.valuation ? (
                          <span
                            className={`text-[10px] font-mono uppercase tracking-wider ${
                              protocol.valuation === "cheap"
                                ? "text-moria-pos"
                                : protocol.valuation === "expensive"
                                  ? "text-moria-neg"
                                  : "text-moria-dim"
                            }`}
                          >
                            {protocol.valuation}
                          </span>
                        ) : (
                          <span className="text-[10px] text-moria-light">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-center">
                        <div
                          className="inline-flex items-center gap-1.5"
                          title={health.reason}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              health.color === "green"
                                ? "bg-moria-pos"
                                : health.color === "amber"
                                  ? "bg-copper animate-pulse"
                                  : "bg-moria-neg animate-pulse"
                            }`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            PERPS
            ═══════════════════════════════════════ */}
        {perps.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <h2 className="text-[15px] font-semibold text-moria-black">Perps</h2>
              <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                Hyperliquid
              </span>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-[12px] sm:text-[13px]">
                <thead>
                  <tr className="border-b border-copper bg-[#F5F4F2]">
                    <th className="text-left px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                      Pair
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                      Side
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                      Size
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                      Mark
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                      PnL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {perps.map((perp: OriPerp) => (
                    <tr key={perp.pair} className="border-b border-moria-rule/30">
                      <td className="px-3 sm:px-5 py-3">
                        <span className="font-mono font-medium text-moria-black">
                          {perp.pair}
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right">
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider ${
                            perp.side === "long" ? "text-moria-pos" : "text-moria-neg"
                          }`}
                        >
                          {perp.side} {perp.leverage}x
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right font-mono tabular-nums text-moria-black">
                        {formatUSD(perp.size_usd)}
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right font-mono tabular-nums text-moria-body">
                        {perp.mark_price !== null ? `$${perp.mark_price.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right">
                        <span
                          className={`font-mono tabular-nums ${
                            (perp.unrealized_pnl_usd ?? 0) > 0
                              ? "text-moria-pos"
                              : (perp.unrealized_pnl_usd ?? 0) < 0
                                ? "text-moria-neg"
                                : "text-moria-dim"
                          }`}
                        >
                          {perp.unrealized_pnl_usd !== null
                            ? `${perp.unrealized_pnl_usd > 0 ? "+" : ""}${formatUSD(perp.unrealized_pnl_usd)}`
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            WATCHLIST — protocols we don't own, sorted by P/E
            ═══════════════════════════════════════ */}
        {watchlistProtocols.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-moria-black">Watchlist</h2>
                <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                  Gimli + Elrond
                </span>
              </div>
              <span className="text-[10px] font-mono text-moria-light">
                {watchlistProtocols.filter((p) => p.valuation === "cheap").length} cheap ·{" "}
                {watchlistProtocols.filter((p) => p.valuation === "fair").length} fair ·{" "}
                {watchlistProtocols.filter((p) => p.valuation === "expensive").length} expensive
              </span>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-[12px] sm:text-[13px]">
                <thead>
                  <tr className="border-b border-copper bg-[#F5F4F2]">
                    <th className="text-left px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                      Protocol
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim hidden sm:table-cell">
                      Theme
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                      P/E
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim hidden md:table-cell">
                      TradFi Peer
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim hidden lg:table-cell">
                      Upside
                    </th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-moria-dim">
                      Verdict
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {watchlistProtocols.slice(0, 15).map((p: GimliProtocol) => {
                    const verdict =
                      p.valuation === "cheap" && (p.upside_to_peer_pct ?? 0) > 30
                        ? { label: "BUY", color: "text-white bg-moria-pos" }
                        : p.valuation === "cheap"
                          ? { label: "ACCUM", color: "text-moria-pos bg-moria-pos/10" }
                          : p.valuation === "fair"
                            ? { label: "HOLD", color: "text-moria-dim bg-moria-faint" }
                            : p.valuation === "expensive"
                              ? { label: "PASS", color: "text-moria-neg bg-moria-neg/10" }
                              : { label: "—", color: "text-moria-light bg-moria-faint" };
                    return (
                      <tr
                        key={p.ticker}
                        className="border-b border-moria-rule/30 hover:bg-moria-faint/30 transition-colors"
                      >
                        <td className="px-3 sm:px-5 py-3">
                          <span className="font-mono font-medium text-moria-black">
                            {p.ticker}
                          </span>
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-right text-[11px] text-moria-dim hidden sm:table-cell">
                          {p.theme}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-right font-mono tabular-nums text-moria-body">
                          {p.pe_ratio !== null ? `${p.pe_ratio.toFixed(1)}x` : "—"}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-right text-[11px] text-moria-light hidden md:table-cell">
                          {p.peer_pe_range}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-right font-mono tabular-nums hidden lg:table-cell">
                          <span
                            className={
                              (p.upside_to_peer_pct ?? 0) > 30
                                ? "text-moria-pos"
                                : (p.upside_to_peer_pct ?? 0) < 0
                                  ? "text-moria-neg"
                                  : "text-moria-dim"
                            }
                          >
                            {p.upside_to_peer_pct !== null
                              ? `${p.upside_to_peer_pct > 0 ? "+" : ""}${p.upside_to_peer_pct.toFixed(0)}%`
                              : "—"}
                          </span>
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider ${verdict.color}`}
                          >
                            {verdict.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </ErrorBoundary>
  );
}
