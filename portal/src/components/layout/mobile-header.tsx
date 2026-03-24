"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, LogOut } from "lucide-react";
import { NAV_ITEMS, ADMIN_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

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
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <h1 className="text-sm font-bold tracking-widest text-primary">
          MORIA CAPITAL
        </h1>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          {/* Drawer panel */}
          <aside className="absolute right-0 top-0 h-full w-64 bg-card border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
            {/* Close button */}
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-xs text-muted-foreground">Conclave Portal</p>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-secondary text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}

              {session?.user?.role === "admin" && (
                <>
                  <div className="my-3 border-t border-border" />
                  {(() => {
                    const Icon = ADMIN_NAV.icon;
                    const active = isActive(ADMIN_NAV.href);
                    return (
                      <Link
                        href={ADMIN_NAV.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-secondary text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {ADMIN_NAV.label}
                      </Link>
                    );
                  })()}
                </>
              )}
            </nav>

            {/* User section */}
            <div className="border-t border-border px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground flex-shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {session?.user?.name ?? "User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
