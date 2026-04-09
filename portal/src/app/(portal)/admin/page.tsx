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

  useEffect(() => {
    if (session && !isAdmin) {
      window.location.href = "/";
    }
  }, [session, isAdmin]);

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
        <p className="text-[14px] text-moria-dim">Access denied</p>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[14px] text-moria-light">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[24px] font-bold text-moria-black">
          Settings
        </h1>
        <p className="text-[14px] mt-1 text-moria-dim">
          Access control and system health
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="card border-l-4 border-moria-neg flex items-start gap-3 p-4 mb-8">
          <span className="inline-block h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 bg-moria-neg" />
          <p className="flex-1 text-[13px] text-moria-neg">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-[12px] hover:underline text-moria-light"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Whitelist */}
      <div className="mb-12">
        <p className="text-copper text-[11px] font-medium uppercase tracking-wide mb-5">
          Whitelist
        </p>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="moria-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Added</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {whitelist.map((entry) => (
                  <tr key={entry.email}>
                    <td>
                      <span className="font-mono text-[13px] text-moria-black">
                        {entry.email}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[12px] uppercase text-moria-dim">
                        {entry.role}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[12px] text-moria-light">
                        {entry.addedAt}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleRemove(entry.email)}
                        disabled={loading}
                        className="text-[13px] hover:underline disabled:opacity-50 text-moria-neg"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {whitelist.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center">
                      <span className="text-[13px] text-moria-light">
                        No users in whitelist
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add form */}
        <div className="card p-6 mt-4">
          <form onSubmit={handleAdd} className="flex items-start gap-3">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                placeholder="user@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-moria-rule focus:border-copper outline-none transition-colors text-[14px]"
                required
              />
              {emailError && (
                <p className="mt-1 text-[12px] text-moria-neg">{emailError}</p>
              )}
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "investor")}
              className="px-4 py-2.5 rounded-lg border border-moria-rule focus:border-copper outline-none transition-colors text-[14px]"
            >
              <option value="investor">Investor</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-moria-black text-white text-[14px] disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      {/* System Health */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-5">
          <p className="text-copper text-[11px] font-medium uppercase tracking-wide">
            System Health
          </p>
          {health && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                background: health.status === "ok" ? "var(--pos)" : health.status === "degraded" ? "var(--copper)" : "var(--neg)",
              }}
            />
          )}
          <button
            onClick={fetchHealth}
            disabled={healthLoading}
            className="ml-auto text-[12px] hover:underline disabled:opacity-50 text-moria-light"
          >
            {healthLoading ? "Checking..." : "Refresh"}
          </button>
        </div>

        {healthError && (
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 bg-moria-neg" />
            <span className="text-[13px] text-moria-neg">
              Health check failed: {healthError}
            </span>
          </div>
        )}

        {health && (
          <div className="space-y-6">
            {/* Data Sources */}
            <div>
              <p className="font-mono text-[11px] mb-3 text-moria-light">Data Sources</p>
              <div className="card overflow-hidden">
                {Object.entries(health.data).map(([name, source]) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 px-5 py-3 border-b border-moria-rule last:border-b-0"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ background: source.ok ? "var(--pos)" : "var(--neg)" }}
                    />
                    <span className="text-[14px] capitalize flex-1 text-moria-black">
                      {name}
                    </span>
                    {source.error && (
                      <span className="font-mono text-[11px] truncate max-w-[200px] text-moria-neg">
                        {source.error}
                      </span>
                    )}
                    {source.updatedAt && (
                      <span className="font-mono text-[11px] text-moria-light">
                        {source.updatedAt}
                      </span>
                    )}
                    {typeof source.count === "number" && (
                      <span className="font-mono text-[11px] tabular-nums text-moria-dim">
                        {source.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Environment */}
            <div>
              <p className="font-mono text-[11px] mb-3 text-moria-light">Environment</p>
              <div className="card overflow-hidden">
                {Object.entries(health.env).map(([name, configured]) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 px-5 py-3 border-b border-moria-rule last:border-b-0"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ background: configured ? "var(--pos)" : "var(--neg)" }}
                    />
                    <span className="font-mono text-[13px] flex-1 text-moria-black">
                      {name}
                    </span>
                    <span className="font-mono text-[11px] text-moria-light">
                      {configured ? "Configured" : "Missing"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Key Status */}
      {Object.keys(keys).length > 0 && (
        <div>
          <p className="text-copper text-[11px] font-medium uppercase tracking-wide mb-5">
            API Keys
          </p>
          <div className="card overflow-hidden">
            {Object.entries(keys).map(([name, configured]) => (
              <div
                key={name}
                className="flex items-center gap-3 px-5 py-3 border-b border-moria-rule last:border-b-0"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ background: configured ? "var(--pos)" : "var(--neg)" }}
                />
                <span className="font-mono text-[13px] flex-1 text-moria-black">
                  {name}
                </span>
                <span className="font-mono text-[11px] text-moria-light">
                  {configured ? "Configured" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
