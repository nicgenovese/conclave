"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";

// ============================================
// Types
// ============================================
interface WhitelistEntry {
  email: string;
  role: string;
  addedAt: string;
}

interface DataSourceHealth {
  ok: boolean;
  error: string | null;
  updatedAt?: string;
  count?: number;
  eventCount?: number;
  latest?: string | null;
}

interface HealthResponse {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  data: Record<string, DataSourceHealth>;
  env: Record<string, boolean>;
}

interface KeyStatus {
  [key: string]: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================
// Component
// ============================================
export default function AdminPage() {
  const { data: session } = useSession();
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [keys, setKeys] = useState<KeyStatus>({});
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "investor">("investor");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Health state
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  const fetchWhitelist = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whitelist");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setWhitelist(data.users ?? data ?? []);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch whitelist";
      setError(msg);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/status");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setKeys(data.keys ?? {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch status";
      setError((prev) => prev ? `${prev}; ${msg}` : msg);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch("/api/health");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: HealthResponse = await res.json();
      setHealth(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch health";
      setHealthError(msg);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      Promise.all([fetchWhitelist(), fetchStatus(), fetchHealth()]).finally(() =>
        setInitialLoading(false)
      );
    } else {
      setInitialLoading(false);
    }
  }, [isAdmin, fetchWhitelist, fetchStatus, fetchHealth]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);

    if (!email) return;
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setEmail("");
      await fetchWhitelist();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add user";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(targetEmail: string) {
    if (!window.confirm(`Remove ${targetEmail} from the whitelist?`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      await fetchWhitelist();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to remove user";
      setError(msg);
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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-[hsl(215,20%,55%)]">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Admin Panel</h1>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          <span className="font-semibold">Error:</span> {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-300 hover:text-red-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Whitelist Management */}
      <h2 className="text-lg font-semibold mb-4">Whitelist Management</h2>

      <div className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(215,20%,18%)]">
              <th className="text-left p-3 font-semibold text-[hsl(215,20%,55%)]">Email</th>
              <th className="text-left p-3 font-semibold text-[hsl(215,20%,55%)]">Role</th>
              <th className="text-left p-3 font-semibold text-[hsl(215,20%,55%)]">Added</th>
              <th className="text-left p-3 font-semibold text-[hsl(215,20%,55%)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {whitelist.map((entry) => (
              <tr key={entry.email} className="border-b border-[hsl(215,20%,18%)]/50">
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
                <td className="p-3 text-[hsl(215,20%,55%)]">{entry.addedAt}</td>
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
                <td colSpan={4} className="p-3 text-center text-[hsl(215,20%,55%)]">
                  No users in whitelist
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="mt-4 flex items-start gap-3">
        <div className="flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
            placeholder="user@example.com"
            className="w-full bg-[hsl(215,20%,16%)] border border-[hsl(215,20%,18%)] rounded px-3 py-2 text-sm"
            required
          />
          {emailError && (
            <p className="mt-1 text-xs text-red-400">{emailError}</p>
          )}
        </div>
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

      {/* System Health */}
      <div className="mt-10">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold">System Health</h2>
          {health && (
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${
                health.status === "ok"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : health.status === "degraded"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {health.status}
            </span>
          )}
          <button
            onClick={fetchHealth}
            disabled={healthLoading}
            className="ml-auto text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
          >
            {healthLoading ? "Checking..." : "Refresh"}
          </button>
        </div>

        {healthError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            Health check failed: {healthError}
          </div>
        )}

        {health && (
          <>
            {/* Data Sources */}
            <h3 className="text-sm font-semibold text-[hsl(215,20%,55%)] mb-2">Data Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {Object.entries(health.data).map(([name, source]) => (
                <div
                  key={name}
                  className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        source.ok ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm font-semibold capitalize">{name}</span>
                  </div>
                  {source.error && (
                    <p className="text-xs text-red-400 mt-1 break-all">{source.error}</p>
                  )}
                  {source.updatedAt && (
                    <p className="text-xs text-[hsl(215,20%,55%)] mt-1">Updated: {source.updatedAt}</p>
                  )}
                  {typeof source.count === "number" && (
                    <p className="text-xs text-[hsl(215,20%,55%)] mt-1">Count: {source.count}</p>
                  )}
                  {source.latest && (
                    <p className="text-xs text-[hsl(215,20%,55%)] mt-1">Latest: {source.latest}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Environment Variables */}
            <h3 className="text-sm font-semibold text-[hsl(215,20%,55%)] mb-2">Environment Variables</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(health.env).map(([name, configured]) => (
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
          </>
        )}
      </div>

      {/* API Key Status (legacy) */}
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
