import { formatUSD } from "@/lib/utils";

interface Bucket {
  name: string;
  total_usd: number;
  pct: number;
  color: string;
}

interface AllocationChartProps {
  buckets: Bucket[];
}

export default function AllocationChart({ buckets }: AllocationChartProps) {
  const circumference = 2 * Math.PI * 80;
  const totalUsd = buckets.reduce((sum, b) => sum + b.total_usd, 0);

  let cumulativePct = 0;
  const slices = buckets.map((bucket) => {
    const dashLength = (bucket.pct / 100) * circumference;
    const dashGap = circumference - dashLength;
    const offset = circumference - (cumulativePct / 100) * circumference;
    cumulativePct += bucket.pct;
    return {
      ...bucket,
      dashArray: `${dashLength} ${dashGap}`,
      dashOffset: offset,
    };
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-6">
        Allocation
      </p>

      <div className="flex justify-center">
        <svg viewBox="0 0 200 200" className="w-40 h-40 sm:w-48 sm:h-48">
          {slices.map((slice) => (
            <circle
              key={slice.name}
              cx={100}
              cy={100}
              r={80}
              fill="none"
              stroke={slice.color}
              strokeWidth={20}
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
            />
          ))}
          <text
            x={100}
            y={96}
            textAnchor="middle"
            className="fill-foreground font-mono text-lg font-semibold"
            fontSize="17"
          >
            {formatUSD(totalUsd)}
          </text>
          <text
            x={100}
            y={114}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="11"
          >
            Total NAV
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-6">
        {buckets.map((bucket) => (
          <div key={bucket.name} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: bucket.color }}
            />
            <span className="text-muted-foreground">{bucket.name}</span>
            <span className="font-mono tabular-nums text-foreground">
              {bucket.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
