"use client";

import { motion } from "framer-motion";
import type { OriData, MacroDataFull, PolymarketEvent } from "@/lib/types";

function fmtPct(v: number | null | undefined, precision = 2): string {
  if (v === null || v === undefined) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(precision)}%`;
}

function fmtPrice(v: number | null | undefined, precision = 2, prefix = "$"): string {
  if (v === null || v === undefined) return "—";
  if (Math.abs(v) >= 1000) return `${prefix}${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `${prefix}${v.toFixed(precision)}`;
}

function fmtVol(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

function PriceCell({
  label,
  value,
  change,
  unit,
  delay,
}: {
  label: string;
  value: string;
  change?: string | null;
  unit?: string;
  delay: number;
}) {
  const isPos = change?.startsWith("+");
  const isNeg = change?.startsWith("-");
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center justify-between py-1.5 border-b border-moria-rule/20 last:border-0"
    >
      <div className="min-w-0">
        <span className="text-[11px] font-mono text-moria-dim">{label}</span>
        {unit && <span className="text-[9px] font-mono text-moria-light ml-1">{unit}</span>}
      </div>
      <div className="flex items-baseline gap-2 flex-shrink-0">
        <span className="font-mono text-[13px] tabular-nums text-moria-black">{value}</span>
        {change && (
          <span
            className={`font-mono text-[10px] tabular-nums ${
              isPos ? "text-moria-pos" : isNeg ? "text-moria-neg" : "text-moria-dim"
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function Column({
  title,
  accent,
  children,
  delay,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card p-4"
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-moria-rule/40">
        <span className={`h-1.5 w-1.5 rounded-full ${accent}`} />
        <h3 className="text-[10px] font-mono uppercase tracking-widest font-semibold text-moria-dim">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </motion.div>
  );
}

export function MarketsSnapshot({
  ori,
  macro,
  polymarket,
}: {
  ori: OriData | null;
  macro: MacroDataFull | null;
  polymarket: PolymarketEvent[];
}) {
  // ───────────────────────────────────────────────
  // Crypto column: pick the most interesting positions from ori
  // ───────────────────────────────────────────────
  const cryptoSpots: Array<{ label: string; price: number | null; change: number | null }> = [];

  if (ori) {
    // ETH always first if we hold it
    const eth = ori.positions.find((p) => p.ticker === "ETH");
    if (eth?.price_usd) {
      cryptoSpots.push({ label: "ETH", price: eth.price_usd, change: null });
    }
    // Any HYPE perp
    const hype = ori.perps.find((p) => p.pair.startsWith("HYPE"));
    if (hype?.mark_price) {
      cryptoSpots.push({ label: "HYPE", price: hype.mark_price, change: null });
    }
    // Top position by value after ETH
    const topOthers = ori.positions
      .filter((p) => p.ticker !== "ETH" && (p.price_usd ?? 0) > 0)
      .sort((a, b) => (b.value_usd ?? 0) - (a.value_usd ?? 0))
      .slice(0, 3 - cryptoSpots.length + 1);
    for (const p of topOthers) {
      if (cryptoSpots.length >= 4) break;
      cryptoSpots.push({ label: p.ticker, price: p.price_usd, change: null });
    }
  }

  // ───────────────────────────────────────────────
  // Commodity column
  // ───────────────────────────────────────────────
  const oc = ori?.commodities;
  const commodities = [
    { label: "Gold", unit: "/oz", price: oc?.gold_usd_oz?.value ?? null, change: oc?.gold_usd_oz?.change_pct_24h ?? null },
    { label: "Silver", unit: "/oz", price: oc?.silver_usd_oz?.value ?? null, change: oc?.silver_usd_oz?.change_pct_24h ?? null },
    { label: "Copper", unit: "/lb", price: oc?.copper_usd_lb?.value ?? null, change: oc?.copper_usd_lb?.change_pct_24h ?? null },
    { label: "WTI", unit: "/bbl", price: oc?.wti_usd_bbl?.value ?? null, change: oc?.wti_usd_bbl?.change_pct_24h ?? null },
  ];

  // ───────────────────────────────────────────────
  // Macro column
  // ───────────────────────────────────────────────
  const macroRows = [
    { label: "Fed Funds", value: macro?.fed.funds_rate.value, precision: 2, suffix: "%" },
    { label: "10Y", value: macro?.yields.y10.value, precision: 2, suffix: "%" },
    { label: "CPI YoY", value: macro?.inflation.cpi_yoy_pct.value, precision: 1, suffix: "%" },
    { label: "Unempl", value: macro?.employment.unrate.value, precision: 1, suffix: "%" },
  ];

  // ───────────────────────────────────────────────
  // Prediction markets column — top 3 by 24h volume
  // ───────────────────────────────────────────────
  const topMarkets = [...polymarket]
    .sort((a, b) => (b.volume_usd || 0) - (a.volume_usd || 0))
    .slice(0, 3);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Crypto */}
      <Column title="Crypto" accent="bg-moria-pos" delay={0}>
        {cryptoSpots.length === 0 ? (
          <p className="text-[11px] text-moria-light italic">no position data</p>
        ) : (
          cryptoSpots.slice(0, 4).map((c, i) => (
            <PriceCell
              key={c.label}
              label={c.label}
              value={fmtPrice(c.price)}
              change={c.change !== null ? fmtPct(c.change) : undefined}
              delay={0.1 + i * 0.05}
            />
          ))
        )}
      </Column>

      {/* Commodities */}
      <Column title="Commodities" accent="bg-copper" delay={0.08}>
        {commodities.map((c, i) => (
          <PriceCell
            key={c.label}
            label={c.label}
            unit={c.unit}
            value={fmtPrice(c.price, c.label === "Copper" ? 2 : 0)}
            change={c.change !== null ? fmtPct(c.change) : undefined}
            delay={0.18 + i * 0.05}
          />
        ))}
      </Column>

      {/* Macro */}
      <Column title="Macro" accent="bg-moria-dim" delay={0.16}>
        {macroRows.map((r, i) => (
          <PriceCell
            key={r.label}
            label={r.label}
            value={
              r.value !== null && r.value !== undefined
                ? `${r.value.toFixed(r.precision)}${r.suffix}`
                : "—"
            }
            delay={0.26 + i * 0.05}
          />
        ))}
      </Column>

      {/* Prediction markets */}
      <Column title="Prediction" accent="bg-moria-neg" delay={0.24}>
        {topMarkets.length === 0 ? (
          <p className="text-[11px] text-moria-light italic">no polymarket data</p>
        ) : (
          topMarkets.map((m, i) => {
            const yes = m.outcomes?.find((o) => o.name === "Yes");
            const yesPct = yes ? Math.round(yes.probability * 100) : null;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.34 + i * 0.05 }}
                className="py-1.5 border-b border-moria-rule/20 last:border-0"
              >
                <p className="text-[10px] text-moria-body leading-tight line-clamp-2 mb-1">
                  {m.question}
                </p>
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-moria-light">{fmtVol(m.volume_usd)} vol</span>
                  {yesPct !== null && (
                    <span
                      className={`tabular-nums font-semibold ${
                        yesPct >= 60 ? "text-moria-pos" : yesPct >= 40 ? "text-copper" : "text-moria-neg"
                      }`}
                    >
                      Yes {yesPct}%
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </Column>
    </div>
  );
}
