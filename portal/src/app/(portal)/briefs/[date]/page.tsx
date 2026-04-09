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
        className="text-copper text-[13px] hover:underline"
      >
        &larr; Back to Briefs
      </Link>

      <div className="card p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-moria-black">
            {params.date}
          </h1>
          <p className="text-sm text-moria-light mt-1">Daily brief</p>
        </div>

        <div className="border-t-[1.5px] border-moria-black mb-8" />

        <div className="prose max-w-none text-sm sm:text-base leading-[1.8]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight mt-10 mb-4 pb-3 border-b border-moria-rule text-moria-black">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="font-serif text-lg sm:text-xl font-semibold tracking-tight mt-8 mb-3 pb-2 border-b border-moria-rule text-moria-black">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-serif text-base sm:text-lg font-semibold mt-6 mb-2 text-moria-black">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="font-serif mb-4 leading-[1.8] text-moria-dim">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="text-moria-black font-semibold">{children}</strong>
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
                <ul className="list-disc pl-6 mb-4 space-y-1.5 font-serif text-moria-dim">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-1.5 font-serif text-moria-dim">
                  {children}
                </ol>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-copper pl-4 text-moria-dim my-4 font-serif italic">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="font-mono text-[13px] px-1.5 py-0.5 bg-moria-faint rounded">
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
