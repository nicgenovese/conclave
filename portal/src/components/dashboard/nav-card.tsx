import { formatUSD } from "@/lib/utils";

interface NavCardProps {
  nav: number;
  updatedAt: string;
}

export default function NavCard({ nav, updatedAt }: NavCardProps) {
  return (
    <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 sm:p-6">
      <p className="text-xs sm:text-sm text-[hsl(215,20%,55%)] uppercase tracking-wider">
        Fund NAV
      </p>
      <p className="font-mono text-2xl sm:text-4xl font-bold text-white mt-2">
        {formatUSD(nav)}
      </p>
      <p className="text-xs sm:text-sm text-[hsl(215,20%,55%)] mt-2">
        Updated {updatedAt}
      </p>
    </div>
  );
}
