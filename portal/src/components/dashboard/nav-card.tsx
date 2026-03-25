interface NavCardProps {
  label: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

export default function NavCard({ label, value, subtitle, trend }: NavCardProps) {
  return (
    <div className="py-5 px-5" style={{ borderRight: "0.5px solid var(--rule)", borderBottom: "0.5px solid var(--rule)" }}>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--copper)" }}>
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="font-mono text-[28px] font-normal tabular-nums tracking-tight" style={{ color: "var(--black)" }}>
          {value}
        </p>
        {trend && trend !== "neutral" && (
          <span
            className="font-mono text-[12px]"
            style={{ color: trend === "up" ? "var(--pos)" : "var(--neg)" }}
          >
            {trend === "up" ? "\u2191" : "\u2193"}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="font-serif text-[12px] mt-1" style={{ color: "var(--dim)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
