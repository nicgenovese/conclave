import { getMacroDataFull } from "@/lib/data";
import { DataError } from "@/components/data-error";
import type { FredPoint } from "@/lib/types";

function StatCard({
  label,
  point,
  unit = "",
  precision = 2,
  color,
}: {
  label: string;
  point: FredPoint;
  unit?: string;
  precision?: number;
  color?: string;
}) {
  return (
    <div className="stat-card">
      <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
        {label}
      </p>
      {point.value !== null ? (
        <>
          <p
            className={`font-mono text-[22px] tabular-nums leading-tight ${color || "text-moria-black"}`}
          >
            {point.value.toFixed(precision)}
            {unit}
          </p>
          {point.date && (
            <p className="text-[9px] font-mono text-moria-light mt-1">as of {point.date}</p>
          )}
        </>
      ) : (
        <p className="font-mono text-[14px] text-moria-light">—</p>
      )}
    </div>
  );
}

function RegimeBadge({
  regime,
  summary,
}: {
  regime: "risk_on" | "risk_off" | "neutral" | "unknown";
  summary: string;
}) {
  const config = {
    risk_on: { bg: "bg-moria-pos/10", text: "text-moria-pos", label: "RISK ON" },
    risk_off: { bg: "bg-moria-neg/10", text: "text-moria-neg", label: "RISK OFF" },
    neutral: { bg: "bg-moria-faint", text: "text-moria-dim", label: "NEUTRAL" },
    unknown: { bg: "bg-moria-faint", text: "text-moria-light", label: "UNKNOWN" },
  }[regime];

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-2">
        <p className="text-copper text-[10px] font-mono uppercase tracking-widest">
          Current Regime
        </p>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-mono font-semibold tracking-wider ${config.bg} ${config.text}`}
        >
          {config.label}
        </span>
      </div>
      <p className="text-[14px] text-moria-dim">{summary}</p>
    </div>
  );
}

export default function MacroDataPage() {
  const data = getMacroDataFull();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
          Elrond — Macro Sage
        </p>
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-tight">
          Macro
        </h1>
        <p className="text-moria-dim text-sm mt-1">
          Fed rates, Treasury yields, inflation, employment, financial conditions from FRED.
        </p>
      </div>

      {!data ? (
        <DataError title="No macro data" message="Run Elrond to fetch FRED data." />
      ) : (
        <>
          {data.health.fred === "no_key" && (
            <div className="card p-4 border-l-4 border-copper">
              <p className="text-[12px] text-moria-dim">
                <span className="text-copper font-medium">FRED_API_KEY not set.</span> Get a free
                key from{" "}
                <a
                  href="https://fred.stlouisfed.org/docs/api/api_key.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-copper hover:underline"
                >
                  fred.stlouisfed.org
                </a>{" "}
                to enable live macro data.
              </p>
            </div>
          )}

          <RegimeBadge regime={data.regime} summary={data.regime_summary} />

          {/* Fed */}
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">Federal Reserve</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatCard label="Fed Funds (Upper)" point={data.fed.funds_rate} unit="%" />
              <StatCard
                label="Balance Sheet (USD bn)"
                point={data.fed.balance_sheet_usd_bn}
                precision={0}
              />
            </div>
          </div>

          {/* Yields */}
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">Treasury Yields</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="2-Year" point={data.yields.y2} unit="%" />
              <StatCard label="10-Year" point={data.yields.y10} unit="%" />
              <StatCard label="30-Year" point={data.yields.y30} unit="%" />
              <StatCard label="10Y Real" point={data.yields.real_10y} unit="%" />
            </div>
            {data.yields.curve_2s10s_bps !== null && (
              <div className="mt-3 card p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                      2s10s Spread
                    </p>
                    <p
                      className={`font-mono text-[22px] tabular-nums leading-tight ${
                        data.yields.inverted ? "text-moria-neg" : "text-moria-black"
                      }`}
                    >
                      {data.yields.curve_2s10s_bps > 0 ? "+" : ""}
                      {data.yields.curve_2s10s_bps} bps
                    </p>
                  </div>
                  {data.yields.inverted && (
                    <span className="text-moria-neg text-[11px] font-mono uppercase tracking-widest">
                      INVERTED
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Inflation */}
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">Inflation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatCard label="CPI YoY" point={data.inflation.cpi_yoy_pct} unit="%" />
              <StatCard label="Core CPI YoY" point={data.inflation.core_cpi_yoy_pct} unit="%" />
            </div>
            <p className="text-[12px] text-moria-dim mt-2 italic">
              Trend: {data.inflation.trend}
            </p>
          </div>

          {/* Employment */}
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">Employment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatCard label="Unemployment Rate" point={data.employment.unrate} unit="%" />
              <StatCard label="NFP Change (MoM)" point={data.employment.nfp_thousands} unit="k" precision={0} />
            </div>
          </div>

          {/* Dollar + Financial Conditions */}
          <div>
            <h2 className="text-[15px] font-semibold text-moria-black mb-4">
              Dollar & Conditions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatCard label="USD Trade-Weighted" point={data.dollar.dxy_proxy} precision={1} />
              <div className="stat-card">
                <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-2">
                  NFCI
                </p>
                {data.financial_conditions.nfci.value !== null ? (
                  <>
                    <p className="font-mono text-[22px] tabular-nums text-moria-black leading-tight">
                      {data.financial_conditions.nfci.value.toFixed(3)}
                    </p>
                    <p className="text-[11px] text-moria-dim mt-1 uppercase tracking-wide">
                      {data.financial_conditions.regime}
                    </p>
                  </>
                ) : (
                  <p className="font-mono text-[14px] text-moria-light">—</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
