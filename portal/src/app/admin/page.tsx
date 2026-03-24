"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

interface WhitelistEntry {
  email: string;
  role: string;
  addedAt: string;
}

interface KeyStatus {
  [key: string]: boolean;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [keys, setKeys] = useState<KeyStatus>({});
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "investor">("investor");
  const [loading, setLoading] = useState(false);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchWhitelist();
      fetchStatus();
    }
  }, [isAdmin]);

  async function fetchWhitelist() {
    try {
      const res = await fetch("/api/admin/whitelist");
      if (res.ok) {
        const data = await res.json();
        setWhitelist(data.users ?? data ?? []);
      }
    } catch {
      // silently fail
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch("/api/admin/status");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? {});
      }
    } catch {
      // silently fail
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      setEmail("");
      await fetchWhitelist();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(targetEmail: string) {
    setLoading(true);
    try {
      await fetch("/api/admin/whitelist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      await fetchWhitelist();
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-[hsl(215,20%,55%)]">Access Denied</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Admin Panel</h1>

      {/* Whitelist Management */}
      <h2 className="text-lg font-semibold mb-4">Whitelist Management</h2>

      <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(215,20%,18%)]">
              <th className="text-left p-3 font-semibold text-[hsl(215,20%,55%)]">
                Email
              </th>
              <th className="text-left p-3 font-semibold text-[hsl(215,20%,55%)]">
                Role
              </th>
              <th className="text-left p-3 font-semibold text-[hsl(215,20%,55%)]">
                Added
              </th>
              <th className="text-left p-3 font-semibold text-[hsl(215,20%,55%)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {whitelist.map((entry) => (
              <tr
                key={entry.email}
                className="border-b border-[hsl(215,20%,18%)]/50"
              >
                <td className="p-3">{entry.email}</td>
                <td className="p-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      entry.role === "admin"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {entry.role}
                  </span>
                </td>
                <td className="p-3 text-[hsl(215,20%,55%)]">
                  {entry.addedAt}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleRemove(entry.email)}
                    disabled={loading}
                    className="text-red-400 hover:text-red-300 text-sm transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {whitelist.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-3 text-center text-[hsl(215,20%,55%)]"
                >
                  No users in whitelist
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Form */}
      <form
        onSubmit={handleAdd}
        className="mt-4 flex items-center gap-3"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="bg-[hsl(215,20%,16%)] border border-[hsl(215,20%,18%)] rounded px-3 py-2 text-sm flex-1"
          required
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "investor")}
          className="bg-[hsl(215,20%,16%)] border border-[hsl(215,20%,18%)] rounded px-3 py-2 text-sm"
        >
          <option value="investor">investor</option>
          <option value="admin">admin</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {/* Environment Status */}
      <h2 className="text-lg font-semibold mt-8 mb-4">API Key Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(keys).map(([name, configured]) => (
          <div
            key={name}
            className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 flex items-center gap-3"
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                configured ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm font-mono">{name}</span>
            <span className="text-xs text-[hsl(215,20%,55%)] ml-auto">
              {configured ? "Configured" : "Missing"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
