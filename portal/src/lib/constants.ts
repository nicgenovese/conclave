import {
  LayoutDashboard,
  FileText,
  Settings,
  Vote,
  Radio,
  Sparkles,
  Activity,
  Coins,
} from "lucide-react";

// Streamlined nav — 7 items built around the new architecture.
// Dashboard: morning brief + key KPIs
// Flow: news + Polymarket deep dive
// Markets: macro + commodities + equities
// DeFi: portfolio + watchlist
// Governance: fee-switch-focused
// Research: memos
export const NAV_ITEMS = [
  { href: "/",            label: "Dashboard",   icon: LayoutDashboard },
  { href: "/flow",        label: "Flow",        icon: Radio },
  { href: "/markets",     label: "Markets",     icon: Activity },
  { href: "/defi",        label: "DeFi",        icon: Coins },
  { href: "/governance",  label: "Governance",  icon: Vote },
  { href: "/research",    label: "Research",    icon: FileText },
] as const;

export const ADMIN_NAV_ITEMS = [
  { href: "/admin",          label: "Settings",    icon: Settings },
  { href: "/admin/research", label: "Deep Dive",   icon: Sparkles },
] as const;

// Legacy single-item export (kept for backward compat with Sidebar/MobileHeader)
export const ADMIN_NAV = ADMIN_NAV_ITEMS[0];

export const FUND_NAME = "Moria Capital";
export const FUND_TAGLINE = "DeFi-Native Value Investing";

export const BUCKET_COLORS: Record<string, string> = {
  Core: "#3b82f6",        // blue
  "DeFi Value": "#8b5cf6", // purple
  Yield: "#10b981",        // green
  Emerging: "#f59e0b",     // amber
  Gas: "#6b7280",          // gray
};
