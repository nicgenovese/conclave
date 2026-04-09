import Link from "next/link";
import { getBriefs } from "@/lib/data";

export default function BriefsPage() {
  const briefs = getBriefs();

  return (
    <div>
      {/* Section Header */}
      <h2 className="text-[20px] font-semibold text-moria-black mb-2">Daily Briefs</h2>

      <p className="text-[14px] mb-8 text-moria-dim">
        Market intelligence and portfolio updates
      </p>

      {briefs.length === 0 ? (
        <div className="py-12">
          <p className="text-[14px] text-moria-light">
            No daily briefs yet. Run the daily brief skill to generate one.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {briefs.map((brief) => (
            <Link
              key={brief.date}
              href={`/briefs/${brief.date}`}
              className="card-interactive block p-5 group"
            >
              <p className="font-mono text-[13px] text-copper">
                {brief.date}
              </p>
              <p className="text-[14px] mt-1 line-clamp-2 leading-relaxed group-hover:underline text-moria-dim">
                {brief.preview}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
