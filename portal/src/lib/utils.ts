import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export function riskColor(status: "green" | "amber" | "red"): string {
  switch (status) {
    case "green": return "text-emerald-400";
    case "amber": return "text-amber-400";
    case "red": return "text-red-400";
  }
}

export function riskBgColor(status: "green" | "amber" | "red"): string {
  switch (status) {
    case "green": return "bg-emerald-400/20 text-emerald-400 border-emerald-400/30";
    case "amber": return "bg-amber-400/20 text-amber-400 border-amber-400/30";
    case "red": return "bg-red-400/20 text-red-400 border-red-400/30";
  }
}

export function getStatusFromScore(score: number): "green" | "amber" | "red" {
  if (score <= 3) return "green";
  if (score <= 6) return "amber";
  return "red";
}
