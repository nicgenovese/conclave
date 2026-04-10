import { getCommodities } from "@/lib/data";
import { DataError } from "@/components/data-error";
import type { CommodityPoint, CurveState } from "@/lib/types";

function PriceCell({
  point,
  unit,
  precision = 2,
}: {
  point: CommodityPoint;
  unit: string;
  precision?: number;
}) {
  if (point.value === null) {
    return (
      <div className="font-mono text-[14px] text-moria-light">
        —
        {point.error && (
          <div className="text-[9px] mt-0.5 text-moria-light italic">{point.error}</div>
        )}
      </div>
    );
  }
  return (
    <div>
      <p className="font-mono text-[18px] tabular-nums text-moria-black leading-tight">
        ${point.value.toFixed(precision)}
      </p>
      <p className="text-[9px] text-moria-light font-mono">{unit}</p>
    </div>
  );
}

function CurveBadge({ curve }: { curve: CurveState }) {
  const config = {
    backwardation: { bg: "bg-moria-pos/10", text: "text-moria-pos", label: "BACKWARDATION" },
    contango: { bg: "bg-moria-neg/10", text: "text-moria-neg", label: "CONTANGO" },
    flat: { bg: "bg-moria-faint", text: "text-moria-dim", label: "FLAT" },
    unknown: { bg: "bg-moria-faint", text: "text-moria-light", label: "UNKNOWN" },
  }[curve.curve];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-medium tracking-wider ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
      {curve.spread_pct !== null && (
        <span className="font-mono text-[11px] text-moria-dim">
          {curve.spread_pct > 0 ? "+" : ""}
          {curve.spread_pct.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export default function CommoditiesPage() {
  const data = getCommodities();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
          Gimli — Commodity Watchman
        </p>
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-tight">
          Commodities
        </h1>
        <p className="text-moria-dim text-sm mt-1">
          Spot metals, oil futures, tokenized commodities, mining equities.
        </p>
      </div>

      {!data ? (
        <DataError
          title="No commodity data"
          message="Run Gimli to fetch commodity prices."
        />
      ) : (
        <>
          {/* Health */}
          {(data.health.metals_api === "no_key" || data.health.alpha_vantage === "no_key") && (
            <div className="card p-4 border-l-4 border-copper">
              <p className="text-[12px] text-moria-dim">
                <span className="text-copper font-medium">Partial data.</span>{" "}
                {data.health.metals_api === "no_key" && "Add METALS_API_KEY for spot metals prices. "}
                {data.health.alpha_vantage === "no_key" && "Add ALPHA_VANTAGE_API_KEY for futures curves. "}
                Tokenized commodities and mining equities work without keys.
              </p>
            </div>
          )}

          {/* Spot prices */}
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">Spot Prices</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  Gold
                </p>
                <PriceCell point={data.spot.gold_usd_oz} unit="USD / oz" />
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  Silver
                </p>
                <PriceCell point={data.spot.silver_usd_oz} unit="USD / oz" />
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  Platinum
                </p>
                <PriceCell point={data.spot.platinum_usd_oz} unit="USD / oz" />
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  Palladium
                </p>
                <PriceCell point={data.spot.palladium_usd_oz} unit="USD / oz" />
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  Copper
                </p>
                <PriceCell point={data.spot.copper_usd_lb} unit="USD / lb" precision={3} />
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  WTI Oil
                </p>
                <PriceCell point={data.spot.wti_usd_bbl} unit="USD / bbl" />
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  Brent Oil
                </p>
                <PriceCell point={data.spot.brent_usd_bbl} unit="USD / bbl" />
              </div>
            </div>
          </div>

          {/* Signals */}
          {data.signals.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold text-moria-black mb-4">Signals</h2>
              <div className="card">
                <div className="divide-y divide-moria-rule/30">
                  {data.signals.map((s, i) => (
                    <div key={i} className="px-5 py-3 flex items-start gap-3">
                      <div
                        className={`h-2 w-2 mt-1.5 rounded-full flex-shrink-0 ${
                          s.severity === "critical"
                            ? "bg-moria-neg"
                            : s.severity === "warning"
                            ? "bg-copper"
                            : "bg-moria-light"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-copper text-[9px] font-mono uppercase tracking-widest">
                            {s.type} · {s.market}
                          </span>
                        </div>
                        <p className="text-[13px] text-moria-black">{s.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Futures */}
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">Futures Curves</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="card p-5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  Gold
                </p>
                <CurveBadge curve={data.futures.gold} />
                {data.futures.gold.front !== null && (
                  <p className="font-mono text-[12px] text-moria-dim mt-2">
                    Front: ${data.futures.gold.front.toFixed(2)}
                    {data.futures.gold.next !== null && ` → $${data.futures.gold.next.toFixed(2)}`}
                  </p>
                )}
              </div>
              <div className="card p-5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  Copper
                </p>
                <CurveBadge curve={data.futures.copper} />
                {data.futures.copper.front !== null && (
                  <p className="font-mono text-[12px] text-moria-dim mt-2">
                    Front: ${data.futures.copper.front.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="card p-5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  WTI Oil
                </p>
                <CurveBadge curve={data.futures.wti} />
                {data.futures.wti.front !== null && (
                  <p className="font-mono text-[12px] text-moria-dim mt-2">
                    Front: ${data.futures.wti.front.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tokenized */}
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">
              Tokenized Commodities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="card p-5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  PAXG
                </p>
                <PriceCell point={data.tokenized.paxg_usd} unit="USD / token" />
              </div>
              <div className="card p-5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  XAUT (Tether Gold)
                </p>
                <PriceCell point={data.tokenized.xaut_usd} unit="USD / token" />
              </div>
              <div className="card p-5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  PAXG Premium vs Spot
                </p>
                {data.tokenized.paxg_premium_bps !== null ? (
                  <p
                    className={`font-mono text-[18px] tabular-nums leading-tight ${
                      Math.abs(data.tokenized.paxg_premium_bps) < 10
                        ? "text-moria-dim"
                        : data.tokenized.paxg_premium_bps > 0
                        ? "text-moria-pos"
                        : "text-moria-neg"
                    }`}
                  >
                    {data.tokenized.paxg_premium_bps > 0 ? "+" : ""}
                    {data.tokenized.paxg_premium_bps} bps
                  </p>
                ) : (
                  <p className="font-mono text-[14px] text-moria-light">—</p>
                )}
              </div>
            </div>
          </div>

          {/* Mining equities */}
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">
              Mining Equities
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  FCX
                </p>
                <PriceCell point={data.mining_equities.freeport_fcx} unit="Freeport" />
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  BHP
                </p>
                <PriceCell point={data.mining_equities.bhp} unit="BHP Group" />
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  RIO
                </p>
                <PriceCell point={data.mining_equities.rio} unit="Rio Tinto" />
              </div>
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  NEM
                </p>
                <PriceCell point={data.mining_equities.newmont_nem} unit="Newmont" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
