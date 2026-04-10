import { getIntelligence } from "@/lib/data";
import type {
  IntelligenceCategory,
  IntelligenceItem,
  IntelligencePriority,
} from "@/lib/types";
import { DataError } from "@/components/data-error";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffHours = (now - d.getTime()) / (1000 * 60 * 60);
    if (diffHours < 1) return "just now";
    if (diffHours < 24) return `${Math.round(diffHours)}h ago`;
    if (diffHours < 48) return "yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function PriorityBadge({ priority }: { priority: IntelligencePriority }) {
  const config = {
    high: { bg: "bg-copper", text: "text-white", label: "HIGH" },
    medium: { bg: "bg-moria-rule/50", text: "text-moria-black", label: "MED" },
    low: { bg: "bg-moria-faint", text: "text-moria-light", label: "LOW" },
  }[priority];

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-wider ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

function CategoryLabel({ category }: { category: IntelligenceCategory }) {
  const labels: Record<IntelligenceCategory, string> = {
    commodity: "COMMODITY",
    defi: "DEFI",
    regulatory: "REGULATORY",
    company: "COMPANY",
    exploits: "EXPLOITS",
  };
  return (
    <span className="text-copper text-[9px] font-mono font-medium uppercase tracking-widest">
      {labels[category]}
    </span>
  );
}

function IntelligenceCard({ item }: { item: IntelligenceItem }) {
  return (
    <div className="card p-4 hover:shadow-card-hover transition-shadow">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <CategoryLabel category={item.category} />
        <span className="text-moria-rule text-[9px]">·</span>
        <span className="font-mono text-[10px] text-moria-dim">{item.source}</span>
        <span className="text-moria-rule text-[9px]">·</span>
        <span className="font-mono text-[10px] text-moria-light">
          {formatDate(item.published)}
        </span>
        <PriorityBadge priority={item.priority} />
      </div>
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="font-serif text-[14px] leading-snug text-moria-black hover:text-copper transition-colors block"
      >
        {item.title}
      </a>
      {item.snippet && (
        <p className="text-[11px] text-moria-dim mt-1.5 line-clamp-2">{item.snippet}</p>
      )}
      {item.matched_keywords.length > 0 && (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          {item.matched_keywords.slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="text-[9px] font-mono text-moria-light px-1.5 py-0.5 bg-moria-faint rounded"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IntelligencePage() {
  const data = getIntelligence();

  const categoryOrder: IntelligenceCategory[] = [
    "exploits",
    "regulatory",
    "commodity",
    "company",
    "defi",
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
          Aragorn — Intelligence Scribe
        </p>
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-tight">
          Intelligence Feed
        </h1>
        <p className="text-moria-dim text-sm mt-1">
          Curated RSS from commodity, DeFi, regulatory, and company sources.
          Scored by relevance to the fund&apos;s positions.
        </p>
      </div>

      {!data ? (
        <DataError
          title="No intelligence data"
          message="Run Aragorn to fetch RSS feeds."
        />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat-card">
              <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                Total Items
              </p>
              <p className="font-mono text-[24px] sm:text-[28px] font-normal tabular-nums text-moria-black leading-tight">
                {data.summary.total_items}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                High Priority
              </p>
              <p className="font-mono text-[24px] sm:text-[28px] font-normal tabular-nums text-copper leading-tight">
                {data.summary.by_priority.high}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                Sources
              </p>
              <p className="font-mono text-[24px] sm:text-[28px] font-normal tabular-nums text-moria-black leading-tight">
                {data.summary.sources_succeeded}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-medium uppercase tracking-wider text-moria-light mb-1">
                Exploits
              </p>
              <p
                className={`font-mono text-[24px] sm:text-[28px] font-normal tabular-nums leading-tight ${
                  data.summary.by_category.exploits > 0 ? "text-moria-neg" : "text-moria-black"
                }`}
              >
                {data.summary.by_category.exploits}
              </p>
            </div>
          </div>

          {/* Top stories */}
          {data.top_stories.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold text-moria-black mb-4">
                Top Stories
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {data.top_stories.map((item) => (
                  <IntelligenceCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* By category */}
          {categoryOrder.map((category) => {
            const items = data.categories[category];
            if (!items || items.length === 0) return null;
            const limited = items.slice(0, 8);

            const titles: Record<IntelligenceCategory, string> = {
              commodity: "Commodity",
              defi: "DeFi",
              regulatory: "Regulatory",
              company: "Company News",
              exploits: "Exploits & Risks",
            };

            return (
              <div key={category}>
                <h2 className="text-[15px] font-semibold text-moria-black mb-4">
                  {titles[category]}{" "}
                  <span className="text-moria-light text-[13px] font-normal font-mono">
                    ({items.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {limited.map((item) => (
                    <IntelligenceCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
