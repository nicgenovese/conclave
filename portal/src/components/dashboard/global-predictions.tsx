"use client";

import { motion } from "framer-motion";
import type { PolymarketEvent } from "@/lib/types";

// Filter out crypto-price noise. A DeFi value fund does NOT care if the market
// thinks BTC hits $150k — it cares about geopolitics, rates, regulation,
// elections, global macro.
const CRYPTO_NOISE = [
  "bitcoin",
  "btc",
  "ethereum",
  "eth",
  "solana",
  "sol",
  "xrp",
  "dogecoin",
  "doge",
  "cardano",
  "ada",
  "shiba",
  "bnb",
  "price",
  "all-time high",
  "ath",
  "crypto etf",
  "hyperliquid",
  "hype",
];

// Positive match: the topics we actively want on the dashboard.
const WANTED_KEYWORDS = [
  "fed",
  "rate cut",
  "interest rate",
  "powell",
  "fomc",
  "trump",
  "election",
  "president",
  "senate",
  "house",
  "congress",
  "supreme court",
  "sec",
  "cftc",
  "stablecoin bill",
  "genius act",
  "war",
  "iran",
  "israel",
  "russia",
  "ukraine",
  "china",
  "taiwan",
  "gaza",
  "nato",
  "recession",
  "gdp",
  "unemployment",
  "inflation",
  "cpi",
  "jobs",
  "ceasefire",
  "sanctions",
];

function looksLikeCrypto(question: string): boolean {
  const q = question.toLowerCase();
  return CRYPTO_NOISE.some((kw) => q.includes(kw));
}

function looksGlobal(question: string): boolean {
  const q = question.toLowerCase();
  return WANTED_KEYWORDS.some((kw) => q.includes(kw));
}

function fmtVol(v: number | null | undefined): string {
  if (!v) return "—";
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

export function GlobalPredictions({ polymarket }: { polymarket: PolymarketEvent[] }) {
  // Stage 1: filter out crypto noise
  // Stage 2: prefer markets that match our "wanted" global keywords
  // Stage 3: fallback sort by volume
  const filtered = polymarket.filter((e) => !looksLikeCrypto(e.question));
  const wanted = filtered.filter((e) => looksGlobal(e.question));
  const pool = wanted.length >= 3 ? wanted : filtered;

  const top = [...pool]
    .sort((a, b) => (b.volume_usd || 0) - (a.volume_usd || 0))
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.18 }}
      className="card p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-copper text-[10px] font-mono uppercase tracking-widest">
            Global Predictions
          </p>
          <h3 className="text-[14px] font-semibold text-moria-black mt-0.5">What the world expects</h3>
        </div>
        <span className="text-[9px] font-mono text-moria-light">Polymarket · 24h vol</span>
      </div>

      {top.length === 0 ? (
        <p className="text-[12px] text-moria-light italic">No qualifying markets right now.</p>
      ) : (
        <div className="space-y-4">
          {top.map((m, i) => {
            const yes = m.outcomes?.find((o) => o.name === "Yes");
            const yesPct = yes ? Math.round(yes.probability * 100) : null;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.3 + i * 0.08 }}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <p className="text-[12px] text-moria-black leading-snug flex-1 line-clamp-2">
                    {m.question}
                  </p>
                  <span className="font-mono text-[9px] text-moria-light flex-shrink-0">
                    {fmtVol(m.volume_usd)}
                  </span>
                </div>
                {yesPct !== null && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-moria-faint rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${yesPct}%` }}
                        transition={{
                          duration: 0.8,
                          delay: 0.5 + i * 0.08,
                          ease: "easeOut",
                        }}
                        className="h-full rounded-full"
                        style={{
                          background:
                            yesPct >= 60
                              ? "var(--pos)"
                              : yesPct >= 40
                                ? "var(--copper)"
                                : "var(--neg)",
                        }}
                      />
                    </div>
                    <span
                      className={`font-mono text-[11px] tabular-nums font-semibold w-10 text-right ${
                        yesPct >= 60
                          ? "text-moria-pos"
                          : yesPct >= 40
                            ? "text-copper"
                            : "text-moria-neg"
                      }`}
                    >
                      {yesPct}%
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
