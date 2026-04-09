"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NAV_ITEMS, ADMIN_NAV } from "@/lib/constants";
import { isAdmin } from "@/lib/roles";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = (session?.user as { role?: string } | undefined)?.role;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-[3px] z-40 hidden h-[calc(100vh-3px)] w-60 flex-col bg-white shadow-[1px_0_0_0_rgba(0,0,0,0.06)] md:flex">
      {/* Brand */}
      <div className="px-6 py-8">
        <h1 className="font-serif text-[15px] font-bold uppercase tracking-[0.25em] text-moria-black">
          Moria Capital
        </h1>
        <p className="text-[12px] mt-0.5 text-moria-dim">
          Conclave Portal
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2.5 text-[14px] rounded-lg transition-colors ${
                active
                  ? "bg-[#F5F4F2] text-copper font-medium"
                  : "text-moria-dim hover:bg-[#F8F7F5]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {/* Admin nav */}
        {isAdmin(userRole) && (
          <>
            <div className="my-4" />
            {(() => {
              const active = isActive(ADMIN_NAV.href);
              return (
                <Link
                  href={ADMIN_NAV.href}
                  className={`block px-4 py-2.5 text-[14px] rounded-lg transition-colors ${
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

      {/* User section */}
      <div className="px-6 py-5 border-t border-moria-rule/30">
        <p className="font-mono text-[11px] truncate text-moria-dim">
          {session?.user?.email ?? "user@example.com"}
        </p>
        <button
          onClick={() => signOut()}
          className="text-[12px] mt-1 text-moria-light hover:text-copper"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
