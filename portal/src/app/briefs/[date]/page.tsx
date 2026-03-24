import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBrief } from "@/lib/data";

export default function BriefPage({ params }: { params: { date: string } }) {
  const content = getBrief(params.date);

  if (!content) notFound();

  return (
    <div>
      <Link
        href="/briefs"
        className="text-sm text-[hsl(215,20%,55%)] hover:text-white transition-colors"
      >
        &larr; Back to Briefs
      </Link>

      <div className="mt-6 mb-4">
        <h1 className="text-2xl font-bold">Brief &mdash; {params.date}</h1>
      </div>

      <div className="border-t border-[hsl(215,20%,18%)] my-6" />

      <div className="prose prose-invert max-w-none text-sm sm:text-base">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl sm:text-2xl font-bold mt-8 mb-4 pb-2 border-b border-[hsl(215,20%,18%)]">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg sm:text-xl font-bold mt-6 mb-3 pb-2 border-b border-[hsl(215,20%,18%)]">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base sm:text-lg font-semibold mt-4 mb-2">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 leading-relaxed">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="text-white font-semibold">{children}</strong>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-sm">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="text-left p-2 sm:p-3 border-b border-[hsl(215,20%,18%)] font-semibold text-[hsl(215,20%,55%)] whitespace-nowrap">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="p-2 sm:p-3 border-b border-[hsl(215,20%,18%)]/50">
                {children}
              </td>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 sm:pl-6 mb-4 space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 sm:pl-6 mb-4 space-y-1">
                {children}
              </ol>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-emerald-500 pl-4 italic text-[hsl(215,20%,55%)] my-4">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="bg-[hsl(215,20%,16%)] px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono break-all">
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
