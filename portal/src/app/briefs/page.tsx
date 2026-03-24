import Link from "next/link";
import { getBriefs } from "@/lib/data";

export default function BriefsPage() {
  const briefs = getBriefs();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Daily Briefs</h1>
      <p className="text-sm text-[hsl(215,20%,55%)] mb-8">
        Market intelligence and portfolio updates
      </p>

      {briefs.length === 0 ? (
        <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-8 text-center">
          <p className="text-[hsl(215,20%,55%)]">
            No daily briefs yet. Run the daily brief skill to generate one.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {briefs.map((brief) => (
            <Link
              key={brief.date}
              href={`/briefs/${brief.date}`}
              className="block bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-5 hover:border-[hsl(215,20%,30%)] transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-white">
                  {brief.date}
                </span>
              </div>
              <p className="text-sm text-[hsl(215,20%,55%)] line-clamp-3">
                {brief.preview}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
