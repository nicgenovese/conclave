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
        <p className="text-sm text-muted-foreground">Access denied</p>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const healthStatusDot = health
    ? health.status === "ok"
      ? "bg-emerald-500"
      : health.status === "degraded"
      ? "bg-amber-500"
      : "bg-red-500"
    : "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Access control and system health
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <span className="h-2 w-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Whitelist */}
      <div>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-4">
          Whitelist
        </h2>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-3 px-5 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
                  Email
                </th>
                <th className="text-left py-3 px-5 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
                  Role
                </th>
                <th className="text-left py-3 px-5 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
                  Added
                </th>
                <th className="text-right py-3 px-5 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {whitelist.map((entry) => (
                <tr key={entry.email} className="border-b border-border/50">
                  <td className="py-4 px-5 font-mono text-sm">{entry.email}</td>
                  <td className="py-4 px-5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                      {entry.role}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-muted-foreground text-sm">
                    {entry.addedAt}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => handleRemove(entry.email)}
                      disabled={loading}
                      className="text-sm text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {whitelist.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No users in whitelist
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Inline add form */}
          <div className="border-t border-border p-4 sm:px-5">
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
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                  required
                />
                {emailError && (
                  <p className="mt-1 text-xs text-red-400">{emailError}</p>
                )}
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "investor")}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
              >
                <option value="investor">Investor</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium">
            System Health
          </h2>
          {health && (
            <span className={`h-2 w-2 rounded-full ${healthStatusDot}`} />
          )}
          <button
            onClick={fetchHealth}
            disabled={healthLoading}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {healthLoading ? "Checking..." : "Refresh"}
          </button>
        </div>

        {healthError && (
          <div className="flex items-center gap-2 text-sm text-red-400 mb-4">
            <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
            Health check failed: {healthError}
          </div>
        )}

        {health && (
          <div className="space-y-6">
            {/* Data Sources */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">Data Sources</p>
              <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
                {Object.entries(health.data).map(([name, source]) => (
                  <div key={name} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        source.ok ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm font-medium capitalize flex-1">{name}</span>
                    {source.error && (
                      <span className="text-xs text-red-400 truncate max-w-[200px]">
                        {source.error}
                      </span>
                    )}
                    {source.updatedAt && (
                      <span className="text-xs text-muted-foreground">
                        {source.updatedAt}
                      </span>
                    )}
                    {typeof source.count === "number" && (
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {source.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Environment Variables */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">Environment</p>
              <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
                {Object.entries(health.env).map(([name, configured]) => (
                  <div key={name} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        configured ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm font-mono flex-1">{name}</span>
                    <span className="text-xs text-muted-foreground">
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
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-4">
            API Keys
          </h2>
          <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
            {Object.entries(keys).map(([name, configured]) => (
              <div key={name} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    configured ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-mono flex-1">{name}</span>
                <span className="text-xs text-muted-foreground">
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
