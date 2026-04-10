import {
  LayoutDashboard,
  FileText,
  Newspaper,
  Shield,
  Settings,
  Bot,
  Vote,
  Gem,
  TrendingUp,
  Radio,
  Sparkles,
} from "lucide-react";

// Ordered for the morning-brief reading flow:
// macro → news → specific → portfolio → risk → archives
export const NAV_ITEMS = [
  { href: "/",            label: "Dashboard",    icon: LayoutDashboard },
  { href: "/macro",       label: "Macro",        icon: TrendingUp },
  { href: "/intelligence",label: "News",         icon: Radio },
  { href: "/commodities", label: "Commodities",  icon: Gem },
  { href: "/governance",  label: "Governance",   icon: Vote },
  { href: "/risk",        label: "Risk",         icon: Shield },
  { href: "/research",    label: "Research",     icon: FileText },
  { href: "/briefs",      label: "Briefs",       icon: Newspaper },
  { href: "/agents",      label: "Agents",       icon: Bot },
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
