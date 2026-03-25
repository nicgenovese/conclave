import Link from "next/link";
import { getBriefs } from "@/lib/data";

export default function BriefsPage() {
  const briefs = getBriefs();

  return (
    <div>
      {/* Section Header */}
      <div className="section-header">
        <span className="section-number">03.</span>
        <h1 className="section-title">Daily Briefs</h1>
      </div>

      <p className="font-serif text-[14px] mb-8" style={{ color: "var(--dim)" }}>
        Market intelligence and portfolio updates
      </p>

      {briefs.length === 0 ? (
        <div className="py-12">
          <p className="font-serif text-[14px]" style={{ color: "var(--light)" }}>
            No daily briefs yet. Run the daily brief skill to generate one.
          </p>
        </div>
      ) : (
        <div>
          {briefs.map((brief, i) => (
            <Link
              key={brief.date}
              href={`/briefs/${brief.date}`}
              className="block group"
            >
              <div
                className="py-5"
                style={{ borderBottom: i < briefs.length - 1 ? "0.5px solid var(--rule)" : "none" }}
              >
                <p className="font-mono text-[13px]" style={{ color: "var(--copper)" }}>
                  {brief.date}
                </p>
                <p className="font-serif text-[14px] mt-1 line-clamp-2 leading-relaxed group-hover:underline" style={{ color: "var(--dim)" }}>
                  {brief.preview}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
