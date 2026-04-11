"use client";

import { motion } from "framer-motion";
import type { IntelligenceItem } from "@/lib/types";

const CATEGORY_ACCENT: Record<string, string> = {
  commodity: "border-l-copper",
  defi: "border-l-moria-pos",
  regulatory: "border-l-moria-neg",
  company: "border-l-moria-dim",
  exploits: "border-l-moria-neg",
};

function hoursAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const h = diff / (1000 * 60 * 60);
    if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
    if (h < 24) return `${Math.round(h)}h`;
    if (h < 48) return "1d";
    return `${Math.round(h / 24)}d`;
  } catch {
    return "—";
  }
}

export function NewsFeed({ items }: { items: IntelligenceItem[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-4 pb-3 bg-moria-faint/30 border-b border-moria-rule/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-moria-pos animate-pulse inline-block" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-moria-dim font-semibold">
            Live Feed · Aragorn
          </span>
        </div>
        <span className="text-[10px] font-mono text-moria-light">
          {items.length} stories · {items.filter((i) => i.priority === "high").length} high priority
        </span>
      </div>

      <div className="divide-y divide-moria-rule/20">
        {items.slice(0, 10).map((item, i) => {
          const accent = CATEGORY_ACCENT[item.category] || "border-l-moria-rule";
          return (
            <motion.a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: "easeOut" }}
              className={`block px-5 py-3 border-l-2 ${accent} hover:bg-moria-faint/30 transition-colors group`}
            >
              <div className="flex items-start gap-3">
                {/* Priority score indicator */}
                <div className="flex-shrink-0 pt-0.5">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.priority === "high"
                        ? "bg-copper"
                        : item.priority === "medium"
                          ? "bg-moria-dim"
                          : "bg-moria-rule"
                    } ${item.priority === "high" ? "animate-pulse" : ""}`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-copper font-semibold">
                      {item.category}
                    </span>
                    <span className="text-moria-rule text-[9px]">·</span>
                    <span className="font-mono text-[9px] text-moria-dim">{item.source}</span>
                    <span className="text-moria-rule text-[9px]">·</span>
                    <span className="font-mono text-[9px] text-moria-light">
                      {hoursAgo(item.published)}
                    </span>
                    {item.priority === "high" && (
                      <span className="px-1.5 py-0 bg-copper text-white text-[8px] font-mono font-medium rounded tracking-wider">
                        HIGH
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="font-serif text-[13px] leading-snug text-moria-black group-hover:text-copper transition-colors line-clamp-2">
                    {item.title}
                  </p>

                  {/* Snippet if available */}
                  {item.snippet && (
                    <p className="text-[11px] text-moria-dim mt-1 line-clamp-1 italic">
                      {item.snippet}
                    </p>
                  )}
                </div>

                {/* Priority score badge */}
                <div className="flex-shrink-0 text-right">
                  <div className="font-mono text-[10px] text-moria-light tabular-nums">
                    {item.priority_score.toFixed(0)}
                  </div>
                </div>
              </div>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
