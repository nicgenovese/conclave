import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getMemo } from "@/lib/data";
import { ErrorBoundary } from "@/components/error-boundary";
import { DataError } from "@/components/data-error";
import type { MemoMeta } from "@/lib/types";

const decisionLabel: Record<MemoMeta["decision"], string> = {
  BUY: "Buy",
  HOLD: "Hold",
  PASS: "Pass",
  SELL: "Sell",
  MONITOR: "Monitor",
};

export default function MemoPage({ params }: { params: { slug: string } }) {
  let data: ReturnType<typeof getMemo> = null;
  let loadError: string | null = null;

  try {
    data = getMemo(params.slug);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  if (loadError) {
    return (
      <div>
        <Link
          href="/research"
          className="text-copper text-[13px] hover:underline"
        >
          &larr; Back to Research
        </Link>
        <div className="mt-4">
          <DataError title="Error loading memo" message={loadError} />
        </div>
      </div>
    );
  }

  if (!data) notFound();

  const { content, meta } = data;

  return (
    <ErrorBoundary>
      <div>
        <Link
          href="/research"
          className="text-copper text-[13px] hover:underline"
        >
          &larr; Back to Research
        </Link>

        <div className="card p-8 max-w-[680px] mt-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-baseline gap-3 mb-2">
              <h1 className="font-serif text-[28px] font-bold tracking-tight text-moria-black">
                {meta.ticker}
              </h1>
              <span className="font-serif text-[14px] text-moria-dim">
                {decisionLabel[meta.decision]}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[13px]">
              <span className="font-mono tabular-nums text-moria-light">{meta.conviction}/10 conviction</span>
              <span className="font-mono text-moria-light">{meta.date}</span>
            </div>
          </div>

          <div className="border-t-[1.5px] border-moria-black mb-8" />

          {/* Markdown content */}
          <div className="prose max-w-none text-[15px] leading-[1.8]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="font-serif text-[22px] font-bold tracking-tight mt-10 mb-4 pb-3 border-b border-moria-rule text-moria-black">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-serif text-[18px] font-bold tracking-tight mt-8 mb-3 pb-2 border-b border-moria-rule text-moria-black">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-serif text-[16px] font-bold mt-6 mb-2 text-moria-black">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="font-serif mb-4 leading-[1.8] text-moria-body">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-moria-black">{children}</strong>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-6">
                    <table className="moria-table">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="text-left">{children}</th>
                ),
                td: ({ children }) => (
                  <td>{children}</td>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-1.5 font-serif text-moria-body">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-4 space-y-1.5 font-serif text-moria-body">
                    {children}
                  </ol>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="pl-4 my-4 font-serif italic border-l-2 border-copper text-moria-dim">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="font-mono text-[13px] px-1 py-0.5 bg-moria-faint rounded">
                    {children}
                  </code>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
