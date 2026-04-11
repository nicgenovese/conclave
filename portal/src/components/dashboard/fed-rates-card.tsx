"use client";

import { motion } from "framer-motion";
import type { MacroDataFull, PolymarketEvent } from "@/lib/types";

export function FedRatesCard({
  macro,
  polymarket,
}: {
  macro: MacroDataFull | null;
  polymarket: PolymarketEvent[];
}) {
  // Find the most prominent Fed / rate cut market by volume
  const fedMarket = [...polymarket]
    .filter((e) => {
      const q = e.question.toLowerCase();
      return (
        q.includes("fed") ||
        q.includes("rate cut") ||
        q.includes("interest rate") ||
        q.includes("fomc") ||
        q.includes("powell")
      );
    })
    .sort((a, b) => (b.volume_usd || 0) - (a.volume_usd || 0))[0];

  const fedYes = fedMarket?.outcomes?.find((o) => o.name === "Yes");
  const fedYesPct = fedYes ? Math.round(fedYes.probability * 100) : null;

  const fedFunds = macro?.fed.funds_rate.value ?? null;
  const y10 = macro?.yields.y10.value ?? null;
  const curve2s10s = macro?.yields.curve_2s10s_bps ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-copper text-[10px] font-mono uppercase tracking-widest">
            Rates
          </p>
          <h3 className="text-[14px] font-semibold text-moria-black mt-0.5">
            The Fed
          </h3>
        </div>
        {macro && (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
              macro.financial_conditions.regime === "loose"
                ? "bg-moria-pos/10 text-moria-pos"
                : macro.financial_conditions.regime === "tight"
                  ? "bg-moria-neg/10 text-moria-neg"
                  : "bg-moria-faint text-moria-dim"
            }`}
          >
            {macro.financial_conditions.regime}
          </span>
        )}
      </div>

      {/* 3-row FACT block */}
      <div className="space-y-3 mb-5">
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="flex items-baseline justify-between py-2 border-b border-moria-rule/30"
        >
          <span className="text-[11px] font-mono uppercase tracking-wider text-moria-dim">
            Fed Funds
          </span>
          <span className="font-mono text-[20px] tabular-nums text-moria-black">
            {fedFunds !== null ? `${fedFunds.toFixed(2)}%` : "—"}
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.42 }}
          className="flex items-baseline justify-between py-2 border-b border-moria-rule/30"
        >
          <span className="text-[11px] font-mono uppercase tracking-wider text-moria-dim">
            10Y
          </span>
          <span className="font-mono text-[20px] tabular-nums text-moria-black">
            {y10 !== null ? `${y10.toFixed(2)}%` : "—"}
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.49 }}
          className="flex items-baseline justify-between py-2"
        >
          <span className="text-[11px] font-mono uppercase tracking-wider text-moria-dim">
            2s10s Curve
          </span>
          <span
            className={`font-mono text-[20px] tabular-nums ${
              curve2s10s !== null && curve2s10s < 0 ? "text-moria-neg" : "text-moria-black"
            }`}
          >
            {curve2s10s !== null
              ? `${curve2s10s > 0 ? "+" : ""}${Math.round(curve2s10s)}bps`
              : "—"}
          </span>
        </motion.div>
      </div>

      {/* Market-implied catalyst */}
      {fedMarket && fedYesPct !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="pt-4 border-t border-moria-rule/40"
        >
          <p className="text-[9px] font-mono uppercase tracking-widest text-copper mb-2">
            Market Says
          </p>
          <p className="text-[12px] text-moria-body leading-snug mb-2 line-clamp-2">
            {fedMarket.question}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-moria-faint rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fedYesPct}%` }}
                transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background:
                    fedYesPct >= 60
                      ? "var(--pos)"
                      : fedYesPct >= 40
                        ? "var(--copper)"
                        : "var(--neg)",
                }}
              />
            </div>
            <span className="font-mono text-[12px] tabular-nums text-moria-black font-semibold">
              {fedYesPct}%
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
