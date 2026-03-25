import Link from "next/link";
import { getBriefs } from "@/lib/data";

export default function BriefsPage() {
  const briefs = getBriefs();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Daily Briefs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Market intelligence and portfolio updates
        </p>
      </div>

      {briefs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
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
              <div className={`py-5 ${i < briefs.length - 1 ? "border-b border-border/50" : ""}`}>
                <p className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">
                  {brief.date}
                </p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
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
