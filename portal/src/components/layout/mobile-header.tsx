"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NAV_ITEMS, ADMIN_NAV } from "@/lib/constants";
import { isAdmin } from "@/lib/roles";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = (session?.user as { role?: string } | undefined)?.role;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

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
      <header className="sticky top-[3px] z-50 flex items-center justify-between bg-white px-5 py-4 shadow-sm md:hidden">
        <h1 className="font-serif text-[14px] font-bold uppercase tracking-[0.25em] text-moria-black">
          Moria Capital
        </h1>
        <button
          onClick={() => setOpen(true)}
          className="p-1 text-moria-dim"
          aria-label="Open navigation"
        >
          {/* Hamburger */}
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
            <line x1="0" y1="0.5" x2="20" y2="0.5" stroke="currentColor" strokeWidth="1" />
            <line x1="0" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1" />
            <line x1="0" y1="13.5" x2="20" y2="13.5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-white backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Content */}
          <div className="relative flex h-full flex-col px-8 py-6">
            {/* Close */}
            <div className="flex items-center justify-between mb-12">
              <h1 className="font-serif text-[14px] font-bold uppercase tracking-[0.25em] text-moria-black">
                Moria Capital
              </h1>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-moria-dim"
                aria-label="Close navigation"
              >
                {/* X */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <line x1="0.5" y1="0.5" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1" />
                  <line x1="15.5" y1="0.5" x2="0.5" y2="15.5" stroke="currentColor" strokeWidth="1" />
                </svg>
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block py-3 px-4 text-[18px] rounded-lg transition-colors ${
                      active
                        ? "bg-[#F5F4F2] text-copper font-medium"
                        : "text-moria-dim hover:bg-[#F8F7F5]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {isAdmin(userRole) && (
                <>
                  <div className="my-4" />
                  {(() => {
                    const active = isActive(ADMIN_NAV.href);
                    return (
                      <Link
                        href={ADMIN_NAV.href}
                        onClick={() => setOpen(false)}
                        className={`block py-3 px-4 text-[18px] rounded-lg transition-colors ${
                          active
                            ? "bg-[#F5F4F2] text-copper font-medium"
                            : "text-moria-dim hover:bg-[#F8F7F5]"
                        }`}
                      >
                        {ADMIN_NAV.label}
                      </Link>
                    );
                  })()}
                </>
              )}
            </nav>

            {/* User */}
            <div className="pt-6 pb-2 border-t border-moria-rule/30">
              <p className="font-mono text-[12px] text-moria-dim">
                {session?.user?.email ?? "user@example.com"}
              </p>
              <button
                onClick={() => signOut()}
                className="mt-1 text-[13px] text-moria-light hover:text-copper"
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
