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
  const slices = buckets.map((bucket, i) => {
    const dashLength = (bucket.pct / 100) * circumference;
    const dashGap = circumference - dashLength;
    const offset = circumference - (cumulativePct / 100) * circumference;
    cumulativePct += bucket.pct;
    return {
      ...bucket,
      dashArray: `${dashLength} ${dashGap}`,
      dashOffset: offset,
      // First slice gets copper accent
      displayColor: i === 0 ? "#6B3620" : bucket.color,
    };
  });

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] mb-6" style={{ color: "var(--copper)" }}>
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
              stroke={slice.displayColor}
              strokeWidth={14}
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
              transform="rotate(-90 100 100)"
            />
          ))}
          <text
            x={100}
            y={96}
            textAnchor="middle"
            fill="#0A0A0A"
            fontFamily="'Courier New', Courier, monospace"
            fontSize="16"
            fontWeight="400"
          >
            {formatUSD(totalUsd)}
          </text>
          <text
            x={100}
            y={114}
            textAnchor="middle"
            fill="#909090"
            fontFamily="'Times New Roman', Georgia, serif"
            fontSize="11"
          >
            Total NAV
          </text>
        </svg>
      </div>

      {/* Horizontal legend with hairline separator */}
      <hr className="hairline mt-6 mb-4" />
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {slices.map((bucket) => (
          <div key={bucket.name} className="flex items-center gap-2 text-[12px]">
            <span
              className="inline-block h-[8px] w-[8px] flex-shrink-0"
              style={{ backgroundColor: bucket.displayColor }}
            />
            <span className="font-serif" style={{ color: "var(--dim)" }}>{bucket.name}</span>
            <span className="font-mono" style={{ color: "var(--black)" }}>
              {bucket.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
