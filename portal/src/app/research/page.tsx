import Link from "next/link";
import { getMemos } from "@/lib/data";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";
import type { MemoMeta } from "@/lib/types";

const decisionLabel: Record<MemoMeta["decision"], string> = {
  BUY: "Buy",
  HOLD: "Hold",
  PASS: "Pass",
  SELL: "Sell",
  MONITOR: "Monitor",
};

export default function ResearchPage() {
  const memos = getMemos();

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Research
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Investment committee deep dives
          </p>
        </div>

        {memos.length === 0 ? (
          <DataError
            title="No research memos yet"
            message="Run 'Conclave: analyze [TICKER]' to generate one."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memos.map((memo) => (
              <Link
                key={memo.slug}
                href={`/research/${memo.slug}`}
                className="rounded-xl border border-border bg-card p-5 sm:p-6 hover:border-foreground/20 transition-colors group"
              >
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-xl font-semibold font-mono tracking-tight">
                    {memo.ticker}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {decisionLabel[memo.decision]}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{memo.conviction}/10</span>
                  <span>{memo.date}</span>
                </div>

                <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                  {memo.summary}
                </p>

                <p className="text-sm text-muted-foreground mt-4 group-hover:text-foreground transition-colors">
                  Read memo &rarr;
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
