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

      {/* Sources — linked pills */}
      {storyline.sources.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-moria-rule/30">
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
