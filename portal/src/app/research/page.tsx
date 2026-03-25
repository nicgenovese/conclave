import Link from "next/link";
import { getMemos } from "@/lib/data";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";
import type { MemoMeta } from "@/lib/types";

const decisionColor: Record<MemoMeta["decision"], string> = {
  BUY: "var(--pos)",
  HOLD: "var(--dim)",
  PASS: "var(--light)",
  SELL: "var(--neg)",
  MONITOR: "var(--copper)",
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
        <div className="section-header">
          <span className="section-number">02.</span>
          <h1 className="section-title">Research</h1>
        </div>

        <p className="font-serif text-[14px] mb-8" style={{ color: "var(--dim)" }}>
          Investment committee deep dives
        </p>

        {memos.length === 0 ? (
          <DataError
            title="No research memos yet"
            message="Run 'Conclave: analyze [TICKER]' to generate one."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {memos.map((memo) => (
              <Link
                key={memo.slug}
                href={`/research/${memo.slug}`}
                className="block p-5 sm:p-6 group transition-colors hover:bg-[var(--faint)]"
                style={{ border: "0.5px solid var(--rule)" }}
              >
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-serif text-[20px] font-bold tracking-tight" style={{ color: "var(--black)" }}>
                    {memo.ticker}
                  </span>
                  <span
                    className="font-serif text-[13px]"
                    style={{ color: decisionColor[memo.decision] }}
                  >
                    {decisionLabel[memo.decision]}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[12px]" style={{ color: "var(--light)" }}>
                  <span className="font-mono tabular-nums">{memo.conviction}/10</span>
                  <span className="font-mono">{memo.date}</span>
                </div>

                <p className="font-serif text-[13px] mt-3 line-clamp-2 leading-relaxed" style={{ color: "var(--dim)" }}>
                  {memo.summary}
                </p>

                <p className="font-serif text-[13px] mt-4 transition-colors" style={{ color: "var(--light)" }}>
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
