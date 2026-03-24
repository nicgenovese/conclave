export const ADMIN_ROUTES = ["/admin"];
export const PUBLIC_ROUTES = ["/auth/signin", "/auth/verify", "/auth/error", "/api/auth", "/api/health"];

// Pages visible to investors (read-only)
export const INVESTOR_PAGES = [
  { href: "/", label: "Dashboard", description: "Portfolio performance" },
  { href: "/research", label: "Research", description: "Investment memos" },
  { href: "/briefs", label: "Briefs", description: "Daily briefs" },
  { href: "/macro", label: "Macro", description: "Market intelligence" },
  { href: "/risk", label: "Risk", description: "Risk framework" },
];

// Additional pages for admins only
export const ADMIN_PAGES = [
  { href: "/admin", label: "Admin", description: "Manage portal" },
];

export function isAdmin(role?: string): boolean {
  return role === "admin";
}

export function canAccessRoute(pathname: string, role?: string): boolean {
  // Public routes always accessible
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) return true;
  // Admin routes need admin role
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) return role === "admin";
  // Everything else needs authentication (any role)
  return !!role;
}
