import {
  LayoutDashboard,
  FileText,
  Newspaper,
  Globe,
  Shield,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/research", label: "Research", icon: FileText },
  { href: "/briefs", label: "Briefs", icon: Newspaper },
  { href: "/macro", label: "Macro", icon: Globe },
  { href: "/risk", label: "Risk", icon: Shield },
] as const;

export const ADMIN_NAV = {
  href: "/admin",
  label: "Admin",
  icon: Settings,
} as const;

export const FUND_NAME = "Moria Capital";
export const FUND_TAGLINE = "DeFi-Native Value Investing";

export const BUCKET_COLORS: Record<string, string> = {
  Core: "#3b82f6",        // blue
  "DeFi Value": "#8b5cf6", // purple
  Yield: "#10b981",        // green
  Emerging: "#f59e0b",     // amber
  Gas: "#6b7280",          // gray
};
