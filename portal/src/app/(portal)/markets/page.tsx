import { getMacroDataFull, getOri, getBenchmarks } from "@/lib/data";
import { ErrorBoundary } from "@/components/error-boundary";

// ─────────────────────────────────────────────
// /markets — Macro + Commodities + Equities in one page
// One screen, one answer: "what's the context for my book today?"
// ─────────────────────────────────────────────

function MetricCell({
  label,
  value,
  precision = 2,
  suffix = "",
}: {
  label: string;
  value: number | null | undefined;
  precision?: number;
  suffix?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
        {label}
      </p>
      <p className="font-mono text-[20px] tabular-nums text-moria-black leading-tight">
        {value !== null && value !== undefined ? `${value.toFixed(precision)}${suffix}` : "—"}
      </p>
    </div>
  );
}

function PriceCell({
  label,
  value,
  change,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  change?: number | null;
  unit?: string;
}) {
  const fmtPrice =
    value !== null && value !== undefined
      ? value >= 1000
        ? `$${Math.round(value).toLocaleString("en-US")}`
        : `$${value.toFixed(2)}`
      : "—";

  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wider text-moria-light mb-1">
        {label}
        {unit && <span className="ml-1 text-moria-rule">{unit}</span>}
      </p>
      <p className="font-mono text-[18px] tabular-nums text-moria-black leading-tight">
        {fmtPrice}
      </p>
      {change !== null && change !== undefined && (
        <p
          className={`font-mono text-[10px] tabular-nums mt-0.5 ${
            change > 0 ? "text-moria-pos" : change < 0 ? "text-moria-neg" : "text-moria-dim"
          }`}
        >
          {change > 0 ? "+" : ""}
          {change.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

export default function MarketsPage() {
  const macro = getMacroDataFull();
  const ori = getOri();
  const benchmarks = getBenchmarks();
  const oc = ori?.commodities;
  const eq = oc?.mining_equities;

  return (
    <ErrorBoundary>
      <div className="space-y-10">
        <div>
          <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
            Markets
          </p>
          <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-tight">
            Markets
          </h1>
          <p className="text-[13px] text-moria-dim mt-1">
            Macro regime, commodities, equities — context for the book.
          </p>
        </div>

        {/* ═══════════════════════════════════════
            MACRO REGIME
            ═══════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <h2 className="text-[15px] font-semibold text-moria-black">Macro</h2>
            <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
              FRED
            </span>
          </div>
          <div className="card p-5">
            {macro ? (
              <>
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-moria-rule/40">
                  <span
                    className={`px-3 py-1 rounded text-[12px] font-mono font-semibold tracking-wider ${
                      macro.regime === "risk_on"
                        ? "bg-moria-pos/10 text-moria-pos"
                        : macro.regime === "risk_off"
                          ? "bg-moria-neg/10 text-moria-neg"
                          : "bg-moria-faint text-moria-dim"
                    }`}
                  >
                    {macro.regime.toUpperCase().replace("_", " ")}
                  </span>
                  <p className="text-[13px] text-moria-body flex-1">{macro.regime_summary}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-5">
                  <MetricCell label="Fed Funds" value={macro.fed.funds_rate.value} suffix="%" />
                  <MetricCell label="10Y Yield" value={macro.yields.y10.value} suffix="%" />
                  <MetricCell
                    label="CPI YoY"
                    value={macro.inflation.cpi_yoy_pct.value}
                    precision={1}
                    suffix="%"
                  />
                  <MetricCell
                    label="Unempl"
                    value={macro.employment.unrate.value}
                    precision={1}
                    suffix="%"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  <MetricCell label="2Y" value={macro.yields.y2.value} suffix="%" />
                  <MetricCell label="30Y" value={macro.yields.y30.value} suffix="%" />
                  <MetricCell
                    label="2s10s"
                    value={macro.yields.curve_2s10s_bps}
                    precision={0}
                    suffix="bps"
                  />
                  <MetricCell
                    label="NFCI"
                    value={macro.financial_conditions.nfci.value}
                    precision={2}
                  />
                </div>

                {macro.ai_parallel && macro.ai_parallel.confidence !== "STUB" && (
                  <div className="mt-5 pt-4 border-t border-moria-rule/40">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-copper mb-2">
                      Closest historical parallel · {macro.ai_parallel.closest_period}
                    </p>
                    <p className="text-[13px] text-moria-body leading-relaxed">
                      <strong className="text-moria-black">Similarities: </strong>
                      {macro.ai_parallel.similarities}
                    </p>
                    <p className="text-[13px] text-moria-body leading-relaxed mt-1">
                      <strong className="text-moria-black">Divergences: </strong>
                      {macro.ai_parallel.divergences}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[13px] text-moria-light italic">
                Macro data not available. FRED fetcher needs to run.
              </p>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            BENCHMARKS — BTC / ETH / SPX
            ═══════════════════════════════════════ */}
        {benchmarks && (
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <h2 className="text-[15px] font-semibold text-moria-black">Benchmarks</h2>
              <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                Live
              </span>
            </div>
            <div className="card p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <PriceCell
                  label="Bitcoin"
                  value={benchmarks.btc.price}
                  change={benchmarks.btc.change_pct_24h}
                />
                <PriceCell
                  label="Ethereum"
                  value={benchmarks.eth.price}
                  change={benchmarks.eth.change_pct_24h}
                />
                <PriceCell
                  label="S&P 500"
                  value={benchmarks.spx.price}
                  change={benchmarks.spx.change_pct_24h}
                />
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            COMMODITIES — thin, we're not a commodities fund
            ═══════════════════════════════════════ */}
        {oc && (
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <h2 className="text-[15px] font-semibold text-moria-black">Commodities</h2>
              <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                Spot
              </span>
            </div>
            <div className="card p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-5">
                <PriceCell
                  label="Gold"
                  unit="/oz"
                  value={oc.gold_usd_oz?.value}
                  change={oc.gold_usd_oz?.change_pct_24h}
                />
                <PriceCell
                  label="Silver"
                  unit="/oz"
                  value={oc.silver_usd_oz?.value}
                  change={oc.silver_usd_oz?.change_pct_24h}
                />
                <PriceCell
                  label="Copper"
                  unit="/lb"
                  value={oc.copper_usd_lb?.value}
                  change={oc.copper_usd_lb?.change_pct_24h}
                />
                <PriceCell
                  label="WTI"
                  unit="/bbl"
                  value={oc.wti_usd_bbl?.value}
                  change={oc.wti_usd_bbl?.change_pct_24h}
                />
              </div>

              {/* Tokenized gold — this is where it actually matters for DeFi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-5 border-t border-moria-rule/40">
                <PriceCell label="PAXG" value={oc.paxg_usd?.value} change={oc.paxg_usd?.change_pct_24h} />
                <PriceCell label="XAUT" value={oc.xaut_usd?.value} change={oc.xaut_usd?.change_pct_24h} />
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            EQUITIES — mining equities only
            ═══════════════════════════════════════ */}
        {eq && (
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <h2 className="text-[15px] font-semibold text-moria-black">Equities</h2>
              <span className="text-copper text-[10px] font-mono uppercase tracking-widest">
                Mining
              </span>
            </div>
            <div className="card p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <PriceCell label="FCX" value={eq.fcx?.value} change={eq.fcx?.change_pct_24h} />
                <PriceCell label="BHP" value={eq.bhp?.value} change={eq.bhp?.change_pct_24h} />
                <PriceCell label="RIO" value={eq.rio?.value} change={eq.rio?.change_pct_24h} />
                <PriceCell label="NEM" value={eq.nem?.value} change={eq.nem?.change_pct_24h} />
              </div>
            </div>
          </section>
        )}
      </div>
    </ErrorBoundary>
  );
}
