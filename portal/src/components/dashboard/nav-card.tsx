interface NavCardProps {
  label: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

export default function NavCard({ label, value, subtitle, trend }: NavCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
        {trend && trend !== "neutral" && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              trend === "up" ? "text-emerald-500" : "text-red-500"
            }`}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              {trend === "up" ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
              )}
            </svg>
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
