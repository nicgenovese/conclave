"use client";

import { motion } from "framer-motion";

export interface DurinSummary {
  nav_usd?: number;
  positions_count?: number;
  macro_regime?: string;
  cheap_defi_count?: number;
  high_relevance_governance?: number;
  critical_risk_alerts?: number;
  high_priority_news?: number;
}

export interface DurinBrief {
  updated_at: string;
  model?: string;
  confidence?: "FACT" | "INFERENCE" | "GUESS" | "STUB";
  what_moved?: string;
  risks_today?: string;
  decisions_this_week?: string;
  summary?: DurinSummary;
}

function hoursAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const h = diff / (1000 * 60 * 60);
    if (h < 1) return "just now";
    if (h < 24) return `${Math.round(h)}h ago`;
    return `${Math.round(h / 24)}d ago`;
  } catch {
    return "—";
  }
}

// A light markdown renderer for what Durin produces. Durin's output is
// paragraph-style with labeled confidence prefixes ("FACT:", "INFERENCE:").
// We split on blank lines and render each block with a confidence color.
function BriefSection({
  heading,
  body,
  delay,
}: {
  heading: string;
  body: string;
  delay: number;
}) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="mb-6 last:mb-0"
    >
      <h4 className="text-[10px] font-mono uppercase tracking-widest text-copper mb-3 pb-2 border-b border-moria-rule/40">
        {heading}
      </h4>
      <div className="space-y-3">
        {paragraphs.map((p, i) => {
          // Detect confidence prefix and color accordingly
          const factMatch = p.match(/^(FACT|INFERENCE|GUESS|STUB):\s*/);
          const confidence = factMatch?.[1] ?? null;
          const text = factMatch ? p.slice(factMatch[0].length) : p;

          const confColor =
            confidence === "FACT"
              ? "text-moria-pos"
              : confidence === "INFERENCE"
                ? "text-copper"
                : confidence === "GUESS"
                  ? "text-moria-neg"
                  : "text-moria-light";

          return (
            <p
              key={i}
              className="font-serif text-[14px] leading-relaxed text-moria-body"
            >
              {confidence && (
                <span className={`font-mono text-[9px] uppercase tracking-widest mr-2 font-semibold ${confColor}`}>
                  {confidence}
                </span>
              )}
              {text}
            </p>
          );
        })}
      </div>
    </motion.div>
  );
}

export function DailyBriefCard({ brief }: { brief: DurinBrief | null }) {
  if (!brief) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card p-6"
      >
        <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
          Durin · Morning Brief
        </p>
        <p className="text-[13px] text-moria-light italic">
          No brief available yet. Run the scheduled task to generate today&rsquo;s brief.
        </p>
      </motion.div>
    );
  }

  const isStub = brief.confidence === "STUB";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="card p-6 sm:p-8 relative overflow-hidden"
    >
      {/* Subtle copper gradient in top-left */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at top left, var(--copper), transparent 50%)",
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
              Durin · Morning Brief
            </p>
            <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-tight text-moria-black">
              Today&rsquo;s letter
            </h2>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] font-mono text-moria-light">
              {hoursAgo(brief.updated_at)}
            </p>
            {brief.model && !isStub && (
              <p className="text-[9px] font-mono text-moria-light mt-0.5">
                {brief.model}
              </p>
            )}
            {isStub && (
              <span className="inline-block mt-1 px-1.5 py-0.5 bg-copper/10 text-copper text-[9px] font-mono rounded">
                STUB
              </span>
            )}
          </div>
        </div>

        {brief.summary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 pb-6 border-b border-moria-rule/40"
          >
            {brief.summary.nav_usd !== undefined && (
              <div>
                <p className="text-[9px] font-mono uppercase tracking-wider text-moria-light mb-0.5">
                  NAV
                </p>
                <p className="font-mono text-[18px] tabular-nums text-moria-black">
                  ${Math.round(brief.summary.nav_usd).toLocaleString("en-US")}
                </p>
              </div>
            )}
            {brief.summary.macro_regime && (
              <div>
                <p className="text-[9px] font-mono uppercase tracking-wider text-moria-light mb-0.5">
                  Regime
                </p>
                <p className="font-mono text-[14px] text-moria-black uppercase tracking-wide">
                  {brief.summary.macro_regime.replace("_", " ")}
                </p>
              </div>
            )}
            {brief.summary.cheap_defi_count !== undefined && (
              <div>
                <p className="text-[9px] font-mono uppercase tracking-wider text-moria-light mb-0.5">
                  Cheap DeFi
                </p>
                <p className="font-mono text-[18px] tabular-nums text-moria-pos">
                  {brief.summary.cheap_defi_count}
                </p>
              </div>
            )}
            {brief.summary.critical_risk_alerts !== undefined && (
              <div>
                <p className="text-[9px] font-mono uppercase tracking-wider text-moria-light mb-0.5">
                  Risk Alerts
                </p>
                <p
                  className={`font-mono text-[18px] tabular-nums ${
                    brief.summary.critical_risk_alerts > 0
                      ? "text-moria-neg"
                      : "text-moria-pos"
                  }`}
                >
                  {brief.summary.critical_risk_alerts}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {brief.what_moved && (
          <BriefSection heading="What moved" body={brief.what_moved} delay={0.45} />
        )}
        {brief.risks_today && (
          <BriefSection heading="Risks today" body={brief.risks_today} delay={0.55} />
        )}
        {brief.decisions_this_week && (
          <BriefSection
            heading="Decisions this week"
            body={brief.decisions_this_week}
            delay={0.65}
          />
        )}
      </div>
    </motion.div>
  );
}
