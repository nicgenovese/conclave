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
  const circumference = 2 * Math.PI * 80; // 502.65
  const totalUsd = buckets.reduce((sum, b) => sum + b.total_usd, 0);

  // Build cumulative offsets for each slice
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
    <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 sm:p-6">
      <h2 className="text-xs sm:text-sm text-[hsl(215,20%,55%)] uppercase tracking-wider mb-4">
        Allocation
      </h2>

      <div className="flex justify-center">
        <svg viewBox="0 0 200 200" className="w-40 h-40 sm:w-[200px] sm:h-[200px]">
          {slices.map((slice) => (
            <circle
              key={slice.name}
              cx={100}
              cy={100}
              r={80}
              fill="none"
              stroke={slice.color}
              strokeWidth={30}
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
              transform="rotate(-90 100 100)"
            />
          ))}
          <text
            x={100}
            y={95}
            textAnchor="middle"
            className="fill-white font-mono text-lg font-bold"
            fontSize="18"
          >
            {formatUSD(totalUsd)}
          </text>
          <text
            x={100}
            y={115}
            textAnchor="middle"
            className="fill-[hsl(215,20%,55%)]"
            fontSize="11"
          >
            Total NAV
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {buckets.map((bucket) => (
          <div key={bucket.name} className="flex items-center gap-2 text-xs sm:text-sm">
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: bucket.color }}
            />
            <span className="text-[hsl(215,20%,55%)] truncate">{bucket.name}</span>
            <span className="font-mono text-white ml-auto flex-shrink-0">
              {bucket.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
