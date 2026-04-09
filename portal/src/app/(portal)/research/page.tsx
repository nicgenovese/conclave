import Link from "next/link";
import { getMemos } from "@/lib/data";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";
import type { MemoMeta } from "@/lib/types";

const decisionColor: Record<MemoMeta["decision"], string> = {
  BUY: "text-moria-pos",
  HOLD: "text-moria-dim",
  PASS: "text-moria-light",
  SELL: "text-moria-neg",
  MONITOR: "text-copper",
};

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
      <div>
        {/* Section Header */}
        <h2 className="text-[20px] font-semibold text-moria-black mb-2">Research</h2>

        <p className="text-[14px] mb-8 text-moria-dim">
          Investment committee deep dives
        </p>

        {memos.length === 0 ? (
          <DataError
            title="No research memos yet"
            message="Run 'Conclave: analyze [TICKER]' to generate one."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {memos.map((memo) => (
              <Link
                key={memo.slug}
                href={`/research/${memo.slug}`}
                className="card-interactive block p-5 sm:p-6 group"
              >
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-serif text-[20px] font-bold tracking-tight text-moria-black">
                    {memo.ticker}
                  </span>
                  <span className={`font-serif text-[13px] ${decisionColor[memo.decision]}`}>
                    {decisionLabel[memo.decision]}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[12px] text-moria-light">
                  <span className="font-mono tabular-nums">{memo.conviction}/10</span>
                  <span className="font-mono">{memo.date}</span>
                </div>

                <p className="font-serif text-[13px] mt-3 line-clamp-2 leading-relaxed text-moria-dim">
                  {memo.summary}
                </p>

                <p className="text-copper text-sm mt-4 transition-colors">
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
