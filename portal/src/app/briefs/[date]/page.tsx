import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBrief } from "@/lib/data";

export default function BriefPage({ params }: { params: { date: string } }) {
  const content = getBrief(params.date);

  if (!content) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/briefs"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; Back to Briefs
      </Link>

      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {params.date}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Daily brief</p>
        </div>

        <div className="border-t border-border mb-8" />

        <div className="prose prose-invert max-w-none text-sm sm:text-base leading-[1.8]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mt-10 mb-4 pb-3 border-b border-border">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight mt-8 mb-3 pb-2 border-b border-border/50">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base sm:text-lg font-semibold mt-6 mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 leading-[1.8] text-muted-foreground">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="text-foreground font-semibold">{children}</strong>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-6 -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-sm">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border whitespace-nowrap">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="py-3 px-3 border-b border-border/50 text-muted-foreground">
                  {children}
                </td>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 sm:pl-6 mb-4 space-y-1.5 text-muted-foreground">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 sm:pl-6 mb-4 space-y-1.5 text-muted-foreground">
                  {children}
                </ol>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-border pl-4 text-muted-foreground my-4">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-secondary px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono break-all">
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
  );
}
