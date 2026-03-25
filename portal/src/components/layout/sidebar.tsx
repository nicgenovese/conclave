"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NAV_ITEMS, ADMIN_NAV } from "@/lib/constants";
import { isAdmin } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = (session?.user as { role?: string } | undefined)?.role;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-border/50 bg-background md:flex">
      {/* Logo */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <h1 className="text-sm font-light uppercase tracking-[0.3em] text-foreground">
            Moria
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-primary" />
              )}
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Admin nav */}
        {isAdmin(userRole) && (
          <>
            <div className="my-4 mx-3 border-t border-border/50" />
            {(() => {
              const Icon = ADMIN_NAV.icon;
              const active = isActive(ADMIN_NAV.href);
              return (
                <Link
                  href={ADMIN_NAV.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-primary" />
                  )}
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {ADMIN_NAV.label}
                </Link>
              );
            })()}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-border/50 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-2xs font-medium text-muted-foreground flex-shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">
              {session?.user?.name ?? "User"}
            </p>
            <button
              onClick={() => signOut()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
