"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS, ADMIN_NAV } from "@/lib/constants";
import { isAdmin } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = (session?.user as { role?: string } | undefined)?.role;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-background/80 backdrop-blur-xl px-5 py-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <h1 className="text-sm font-light uppercase tracking-[0.3em] text-foreground">
            Moria
          </h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Full-screen drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/90 backdrop-blur-xl"
            onClick={() => setOpen(false)}
          />

          {/* Drawer content — full screen */}
          <div className="relative flex h-full flex-col px-8 py-6">
            {/* Close */}
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-sm font-light uppercase tracking-[0.3em] text-foreground">
                  Moria
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav items — large touch targets */}
            <nav className="flex-1 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-4 py-4 text-lg font-medium transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}

              {isAdmin(userRole) && (
                <>
                  <div className="my-4 border-t border-border/50" />
                  {(() => {
                    const Icon = ADMIN_NAV.icon;
                    const active = isActive(ADMIN_NAV.href);
                    return (
                      <Link
                        href={ADMIN_NAV.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-4 py-4 text-lg font-medium transition-colors",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {ADMIN_NAV.label}
                      </Link>
                    );
                  })()}
                </>
              )}
            </nav>

            {/* User section */}
            <div className="border-t border-border/50 pt-6 pb-2">
              <p className="text-sm text-foreground">
                {session?.user?.name ?? "User"}
              </p>
              <button
                onClick={() => signOut()}
                className="mt-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
