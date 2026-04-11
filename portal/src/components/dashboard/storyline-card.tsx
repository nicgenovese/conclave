"use client";

import { motion } from "framer-motion";
import type { Storyline } from "@/lib/types";

const CATEGORY_COLORS: Record<Storyline["category"], string> = {
  Geopolitics: "border-l-moria-neg text-moria-neg",
  Regulatory: "border-l-copper text-copper",
  DeFi: "border-l-moria-pos text-moria-pos",
  Commodity: "border-l-copper text-copper",
  Macro: "border-l-copper text-copper",
  Crypto: "border-l-moria-pos text-moria-pos",
  Other: "border-l-moria-dim text-moria-dim",
};

function formatProbability(p: number | null): string {
  if (p === null) return "—";
  return `${Math.round(p * 100)}%`;
}

function formatVolume(v: number | null): string {
  if (v === null) return "—";
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

function formatEndDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffDays = Math.round((d.getTime() - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "ended";
    if (diffDays === 0) return "ends today";
    if (diffDays === 1) return "ends in 1d";
    return `ends in ${diffDays}d`;
  } catch {
    return "—";
  }
}

export function StorylineCard({
  storyline,
  index,
}: {
  storyline: Storyline;
  index: number;
}) {
  const colorClass = CATEGORY_COLORS[storyline.category] || CATEGORY_COLORS.Other;
  const borderClass = colorClass.split(" ")[0];
  const textClass = colorClass.split(" ")[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={`card border-l-4 ${borderClass} p-5`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[9px] font-mono uppercase tracking-widest font-semibold ${textClass}`}
            >
              {storyline.category}
            </span>
            <span className="text-moria-rule text-[9px]">·</span>
            <span className="text-[9px] font-mono text-moria-light">
              importance {storyline.importance}/10
            </span>
          </div>
          <h3 className="font-serif text-[16px] sm:text-[18px] font-bold text-moria-black leading-snug">
            {storyline.title}
          </h3>
        </div>
      </div>

      {/* Summary */}
      <p className="font-serif text-[13px] text-moria-body leading-relaxed mb-4">
        {storyline.summary}
      </p>

      {/* Polymarket odds — the "what does the market think" bar */}
      {storyline.polymarket && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: index * 0.08 + 0.3 }}
          className="mb-4 p-3 bg-moria-faint/40 rounded-md"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-copper font-semibold">
              Polymarket
            </span>
            <span className="text-moria-rule text-[9px]">·</span>
            <span className="text-[9px] font-mono text-moria-light">
              {formatVolume(storyline.polymarket.volume_24h_usd)} vol
            </span>
            <span className="text-moria-rule text-[9px]">·</span>
            <span className="text-[9px] font-mono text-moria-light">
              {formatEndDate(storyline.polymarket.end_date)}
            </span>
          </div>
          <p className="text-[12px] text-moria-dim italic mb-2 line-clamp-1">
            {storyline.polymarket.question}
          </p>
          {/* Probability bar */}
          {storyline.polymarket.yes_probability !== null && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-moria-pos w-14 flex-shrink-0">
                Yes {formatProbability(storyline.polymarket.yes_probability)}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-moria-faint overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(storyline.polymarket.yes_probability || 0) * 100}%` }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.08 + 0.5,
                    ease: "easeOut",
                  }}
                  className="h-full rounded-full"
                  style={{
                    background:
                      (storyline.polymarket.yes_probability ?? 0) >= 0.6
                        ? "var(--pos)"
                        : (storyline.polymarket.yes_probability ?? 0) >= 0.4
                          ? "var(--copper)"
                          : "var(--neg)",
                  }}
                />
              </div>
              <span className="font-mono text-[11px] text-moria-neg w-16 flex-shrink-0 text-right">
                No {formatProbability(storyline.polymarket.no_probability)}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Sources */}
      {storyline.sources.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-moria-rule/30">
          {storyline.sources.slice(0, 4).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-moria-dim hover:text-copper transition-colors border border-moria-rule/50 rounded-sm px-2 py-0.5"
            >
              {s.source}
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}
