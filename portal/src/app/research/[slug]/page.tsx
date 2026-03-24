import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getMemo } from "@/lib/data";
import type { MemoMeta } from "@/lib/types";

const decisionColor: Record<MemoMeta["decision"], string> = {
  BUY: "bg-emerald-500/20 text-emerald-400",
  HOLD: "bg-amber-500/20 text-amber-400",
  PASS: "bg-gray-500/20 text-gray-400",
  SELL: "bg-red-500/20 text-red-400",
  MONITOR: "bg-blue-500/20 text-blue-400",
};

export default function MemoPage({ params }: { params: { slug: string } }) {
  const data = getMemo(params.slug);
  if (!data) notFound();

  const { content, meta } = data;

  return (
    <div>
      <Link
        href="/research"
        className="text-sm text-[hsl(215,20%,55%)] hover:text-white transition-colors"
      >
        &larr; Back to Research
      </Link>

      <div className="mt-6">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold font-mono">{meta.ticker}</h1>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${decisionColor[meta.decision]}`}
          >
            {meta.decision}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-[hsl(215,20%,55%)]">
          <span>Conviction: {meta.conviction}/10</span>
          <span>{meta.date}</span>
        </div>
      </div>

      <div className="border-t border-[hsl(215,20%,18%)] my-6" />

      <div className="prose prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-[hsl(215,20%,18%)]">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold mt-6 mb-3 pb-2 border-b border-[hsl(215,20%,18%)]">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 leading-relaxed">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="text-white font-semibold">{children}</strong>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="w-full text-sm">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="text-left p-3 border-b border-[hsl(215,20%,18%)] font-semibold text-[hsl(215,20%,55%)]">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="p-3 border-b border-[hsl(215,20%,18%)]/50">
                {children}
              </td>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-emerald-500 pl-4 italic text-[hsl(215,20%,55%)] my-4">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="bg-[hsl(215,20%,16%)] px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
