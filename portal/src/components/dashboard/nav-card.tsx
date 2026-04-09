interface NavCardProps {
  label: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

export default function NavCard({ label, value, subtitle, trend }: NavCardProps) {
  return (
    <div className="stat-card">
      <p className="text-copper text-[11px] font-medium uppercase tracking-wide">
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="font-mono text-2xl font-normal tabular-nums tracking-tight text-moria-black">
          {value}
        </p>
        {trend && trend !== "neutral" && (
          <span
            className={`font-mono text-[12px] ${trend === "up" ? "text-moria-pos" : "text-moria-neg"}`}
          >
            {trend === "up" ? "\u2191" : "\u2193"}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-moria-dim text-sm mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
