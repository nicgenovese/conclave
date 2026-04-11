"use client";

import { motion } from "framer-motion";

export interface AgentStatus {
  name: string;
  label: string;
  updated_at: string | null;
  ok: boolean;
}

function hoursAgo(iso: string | null): string {
  if (!iso || iso === "N/A") return "—";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const h = diff / (1000 * 60 * 60);
    if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
    if (h < 24) return `${Math.round(h)}h`;
    return `${Math.round(h / 24)}d`;
  } catch {
    return "—";
  }
}

function isStale(iso: string | null, hours = 24): boolean {
  if (!iso || iso === "N/A") return true;
  try {
    return Date.now() - new Date(iso).getTime() > hours * 3600_000;
  } catch {
    return true;
  }
}

export function AgentStatusStrip({ agents }: { agents: AgentStatus[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 sm:gap-4 flex-wrap text-[10px] font-mono"
    >
      {agents.map((a, i) => {
        const stale = isStale(a.updated_at);
        const dotClass = !a.ok
          ? "bg-moria-neg"
          : stale
            ? "bg-copper"
            : "bg-moria-pos animate-pulse";
        return (
          <motion.div
            key={a.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            className="inline-flex items-center gap-1.5"
          >
            <span className={`h-1.5 w-1.5 rounded-full inline-block ${dotClass}`} />
            <span className="text-moria-dim uppercase tracking-wider">{a.label}</span>
            <span className="text-moria-light">{hoursAgo(a.updated_at)}</span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
