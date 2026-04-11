import { getIntelligence, getHeadlines } from "@/lib/data";
import { NewsFeed } from "@/components/dashboard/news-feed";
import { ErrorBoundary } from "@/components/error-boundary";
import type { PolymarketEvent } from "@/lib/types";

// ─────────────────────────────────────────────
// /flow — News + Polymarket deep dive
// Everything the world is trading and saying, ranked and visualized.
// Dashboard gives you 4 stories; Flow gives you the full stream.
// ─────────────────────────────────────────────

const CATEGORY_LABELS = {
  politics: ["election", "trump", "president", "senate", "house", "congress", "supreme court"],
  geopolitics: ["war", "iran", "israel", "russia", "ukraine", "china", "taiwan", "gaza", "nato", "sanctions", "ceasefire"],
  macro: ["fed", "rate cut", "interest rate", "powell", "fomc", "recession", "gdp", "inflation", "cpi", "jobs", "unemployment"],
  regulation: ["sec", "cftc", "stablecoin bill", "genius act", "etf"],
  crypto: ["bitcoin", "btc", "ethereum", "eth", "solana", "sol", "xrp", "hyperliquid", "hype"],
  other: [],
} as const;

type Category = keyof typeof CATEGORY_LABELS;

function classifyMarket(question: string): Category {
  const q = question.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_LABELS)) {
    if (cat === "other") continue;
    if ((keywords as readonly string[]).some((kw) => q.includes(kw))) {
      return cat as Category;
    }
  }
  return "other";
}

const CATEGORY_COLORS: Record<Category, { border: string; bg: string; text: string }> = {
  politics: { border: "border-l-moria-neg", bg: "bg-moria-neg/5", text: "text-moria-neg" },
  geopolitics: { border: "border-l-copper", bg: "bg-copper/5", text: "text-copper" },
  macro: { border: "border-l-moria-pos", bg: "bg-moria-pos/5", text: "text-moria-pos" },
  regulation: { border: "border-l-moria-dim", bg: "bg-moria-dim/5", text: "text-moria-dim" },
  crypto: { border: "border-l-moria-light", bg: "bg-moria-faint", text: "text-moria-light" },
  other: { border: "border-l-moria-rule", bg: "bg-moria-faint/30", text: "text-moria-light" },
};

function fmtVol(v: number | null | undefined): string {
  if (!v) return "—";
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

function PolymarketRow({ m }: { m: PolymarketEvent }) {
  const cat = classifyMarket(m.question);
  const colors = CATEGORY_COLORS[cat];
  const yes = m.outcomes?.find((o) => o.name === "Yes");
  const yesPct = yes ? Math.round(yes.probability * 100) : null;

  return (
    <a
      href={m.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block border-l-2 ${colors.border} ${colors.bg} px-5 py-3 hover:bg-moria-faint/60 transition-colors group`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-[9px] font-mono uppercase tracking-widest font-semibold ${colors.text}`}
            >
              {cat}
            </span>
            <span className="text-moria-rule text-[9px]">·</span>
            <span className="font-mono text-[9px] text-moria-light">{fmtVol(m.volume_usd)} vol</span>
          </div>
          <p className="text-[13px] text-moria-black leading-snug group-hover:text-copper transition-colors line-clamp-2">
            {m.question}
          </p>
          {yesPct !== null && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-1.5 bg-moria-faint rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${yesPct}%`,
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
        </div>
      </div>
    </a>
  );
}

export default function FlowPage() {
  const intelligence = getIntelligence();
  const headlines = getHeadlines();
  const polymarket = headlines?.polymarket ?? [];

  // Group markets by category, sorted by volume within group
  const byCategory: Record<Category, PolymarketEvent[]> = {
    politics: [],
    geopolitics: [],
    macro: [],
    regulation: [],
    crypto: [],
    other: [],
  };
  for (const m of polymarket) {
    byCategory[classifyMarket(m.question)].push(m);
  }
  // Sort each group by volume
  for (const cat of Object.keys(byCategory) as Category[]) {
    byCategory[cat].sort((a, b) => (b.volume_usd || 0) - (a.volume_usd || 0));
  }

  // Order: politics → geopolitics → macro → regulation → crypto → other
  const categoryOrder: Category[] = ["politics", "geopolitics", "macro", "regulation", "crypto", "other"];

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div>
          <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
            Aragorn · Signal
          </p>
          <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-tight">
            Flow
          </h1>
          <p className="text-[13px] text-moria-dim mt-1">
            News, rumors, and prediction markets — everything the world is trading and saying, ranked.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left 3 cols — news feed */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2.5 mb-3">
              <h2 className="text-[14px] font-semibold text-moria-black">News Stream</h2>
              <span className="text-[9px] font-mono text-moria-light">
                {intelligence?.top_stories?.length ?? 0} stories · updated{" "}
                {intelligence?.updated_at
                  ? new Date(intelligence.updated_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>
            <NewsFeed items={intelligence?.top_stories ?? []} />
          </div>

          {/* Right 2 cols — Polymarket categorised */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-[14px] font-semibold text-moria-black">Prediction Markets</h2>
              <span className="text-[9px] font-mono text-moria-light">
                {polymarket.length} events · grouped
              </span>
            </div>
            {categoryOrder.map((cat) => {
              const group = byCategory[cat];
              if (group.length === 0) return null;
              return (
                <div key={cat} className="card overflow-hidden">
                  <div className="px-5 pt-3 pb-2 bg-moria-faint/30 border-b border-moria-rule/40">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-moria-dim font-semibold">
                      {cat} · {group.length}
                    </span>
                  </div>
                  <div className="divide-y divide-moria-rule/30">
                    {group.slice(0, 4).map((m) => (
                      <PolymarketRow key={m.id} m={m} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
