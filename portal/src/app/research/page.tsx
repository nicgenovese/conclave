import Link from "next/link";
import { getMemos } from "@/lib/data";
import { DataError } from "@/components/data-error";
import { ErrorBoundary } from "@/components/error-boundary";
import type { MemoMeta } from "@/lib/types";

const decisionColor: Record<MemoMeta["decision"], string> = {
  BUY: "bg-emerald-500/20 text-emerald-400",
  HOLD: "bg-amber-500/20 text-amber-400",
  PASS: "bg-gray-500/20 text-gray-400",
  SELL: "bg-red-500/20 text-red-400",
  MONITOR: "bg-blue-500/20 text-blue-400",
};

export default function ResearchPage() {
  const memos = getMemos();

  return (
    <ErrorBoundary>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Research Memos</h1>
        <p className="text-sm text-[hsl(215,20%,55%)] mb-6 sm:mb-8">
          Investment committee deep dives
        </p>

        {memos.length === 0 ? (
          <DataError
            title="No research memos yet"
            message="Run 'Conclave: analyze [TICKER]' to generate one."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {memos.map((memo) => (
              <Link
                key={memo.slug}
                href={`/research/${memo.slug}`}
                className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 sm:p-6 hover:border-[hsl(215,20%,30%)] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono">
                    {memo.ticker}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${decisionColor[memo.decision]}`}
                  >
                    {memo.decision}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm text-[hsl(215,20%,55%)]">
                  <span>Conviction: {memo.conviction}/10</span>
                  <span>{memo.date}</span>
                </div>

                <p className="text-sm mt-3 line-clamp-2">{memo.summary}</p>

                <p className="text-sm text-emerald-400 mt-4">
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
