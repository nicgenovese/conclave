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
    <aside className="fixed left-0 top-[3px] z-40 hidden h-[calc(100vh-3px)] w-60 flex-col bg-white md:flex"
      style={{ borderRight: "0.5px solid var(--rule)" }}
    >
      {/* Brand */}
      <div className="px-6 py-8">
        <h1 className="font-serif text-[15px] font-bold uppercase tracking-[0.25em]" style={{ color: "var(--black)" }}>
          Moria Capital
        </h1>
        <p className="font-serif text-[12px] mt-0.5" style={{ color: "var(--dim)" }}>
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
              className="relative block px-4 py-2.5 font-serif text-[14px] transition-colors"
              style={{
                color: active ? "var(--copper)" : "var(--dim)",
                borderLeft: active ? "3px solid var(--copper)" : "3px solid transparent",
                fontWeight: active ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          );
        })}

        {/* Admin nav */}
        {isAdmin(userRole) && (
          <>
            <hr className="hairline my-4 mx-3" />
            {(() => {
              const active = isActive(ADMIN_NAV.href);
              return (
                <Link
                  href={ADMIN_NAV.href}
                  className="relative block px-4 py-2.5 font-serif text-[14px] transition-colors"
                  style={{
                    color: active ? "var(--copper)" : "var(--dim)",
                    borderLeft: active ? "3px solid var(--copper)" : "3px solid transparent",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {ADMIN_NAV.label}
                </Link>
              );
            })()}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="px-6 py-5" style={{ borderTop: "0.5px solid var(--rule)" }}>
        <p className="font-mono text-[11px] truncate" style={{ color: "var(--dim)" }}>
          {session?.user?.email ?? "user@example.com"}
        </p>
        <button
          onClick={() => signOut()}
          className="font-serif text-[12px] mt-1 hover:underline"
          style={{ color: "var(--light)" }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
