"use client";

import { motion } from "framer-motion";
import type { OriData, PriceRow } from "@/lib/types";

export function NavReturnCard({
  ori,
  benchmarks,
}: {
  ori: OriData | null;
  benchmarks: PriceRow[];
}) {
  const nav = ori?.nav_usd ?? 0;
  const positions = ori?.positions.length ?? 0;

  // Inception = today (0% baseline). Until we have history we show "0.0%"
  // which the 12h cron will begin to populate forward.
  const inceptionReturnPct = 0.0;
  const inceptionLabel = "since inception";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="card p-6 relative overflow-hidden"
    >
      {/* Subtle copper gradient accent */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at top right, var(--copper), transparent 60%)",
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
              Moria NAV
            </p>
            <p className="font-mono text-[32px] sm:text-[40px] tabular-nums text-moria-black leading-none">
              ${nav.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] font-mono text-moria-dim mt-1">
              {positions} positions · {inceptionLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-widest text-moria-light mb-1">
              Return
            </p>
            <p
              className={`font-mono text-[24px] sm:text-[28px] tabular-nums font-semibold leading-none ${
                inceptionReturnPct > 0
                  ? "text-moria-pos"
                  : inceptionReturnPct < 0
                    ? "text-moria-neg"
                    : "text-moria-dim"
              }`}
            >
              {inceptionReturnPct > 0 ? "+" : ""}
              {inceptionReturnPct.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Benchmark comparison strip */}
        <div className="mt-6 pt-4 border-t border-moria-rule/40">
          <p className="text-[9px] font-mono uppercase tracking-widest text-moria-light mb-3">
            Benchmarks · Live
          </p>
          <div className="grid grid-cols-3 gap-4">
            {benchmarks.map((b, i) => {
              const fmtPrice =
                b.price !== null
                  ? b.price >= 1000
                    ? `$${Math.round(b.price).toLocaleString("en-US")}`
                    : `$${b.price.toFixed(2)}`
                  : "—";
              const d24 = b.change_24h_pct;
              const d7 = b.change_7d_pct;
              return (
                <motion.div
                  key={b.ticker}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-moria-dim mb-0.5">
                    {b.name}
                  </p>
                  <p className="font-mono text-[16px] sm:text-[18px] tabular-nums text-moria-black leading-tight">
                    {fmtPrice}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {d24 !== null && (
                      <span
                        className={`font-mono text-[10px] tabular-nums ${
                          d24 > 0 ? "text-moria-pos" : d24 < 0 ? "text-moria-neg" : "text-moria-dim"
                        }`}
                      >
                        {d24 > 0 ? "+" : ""}
                        {d24.toFixed(1)}%
                        <span className="text-moria-light ml-0.5">24h</span>
                      </span>
                    )}
                    {d7 !== null && (
                      <span
                        className={`font-mono text-[10px] tabular-nums ${
                          d7 > 0 ? "text-moria-pos" : d7 < 0 ? "text-moria-neg" : "text-moria-dim"
                        }`}
                      >
                        {d7 > 0 ? "+" : ""}
                        {d7.toFixed(1)}%
                        <span className="text-moria-light ml-0.5">7d</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
