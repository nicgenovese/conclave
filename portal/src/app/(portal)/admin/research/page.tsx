"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

// Portfolio + watchlist slugs — the user picks one to deep-dive on
const PROTOCOLS = [
  { ticker: "AAVE", name: "Aave", theme: "Portfolio" },
  { ticker: "HYPE", name: "Hyperliquid", theme: "Portfolio" },
  { ticker: "PENDLE", name: "Pendle", theme: "Portfolio" },
  { ticker: "MORPHO", name: "Morpho", theme: "Portfolio" },
  { ticker: "UNI", name: "Uniswap", theme: "Portfolio" },
  { ticker: "LDO", name: "Lido", theme: "Portfolio" },
  { ticker: "COW", name: "CoW Protocol", theme: "Portfolio" },
  { ticker: "ETH", name: "Ethereum", theme: "Portfolio" },
  { ticker: "SOL", name: "Solana", theme: "Watch-Core" },
  { ticker: "BTC", name: "Bitcoin", theme: "Watch-Core" },
  { ticker: "TAO", name: "Bittensor", theme: "Watch-AI" },
  { ticker: "VIRTUAL", name: "Virtuals Protocol", theme: "Watch-AI" },
  { ticker: "RENDER", name: "Render Network", theme: "Watch-AI" },
  { ticker: "IO", name: "io.net", theme: "Watch-AI" },
  { ticker: "AKT", name: "Akash Network", theme: "Watch-AI" },
  { ticker: "NEAR", name: "Near Protocol", theme: "Watch-AI" },
  { ticker: "WLD", name: "Worldcoin", theme: "Watch-AI" },
  { ticker: "ZEC", name: "Zcash", theme: "Watch-Privacy" },
  { ticker: "XMR", name: "Monero", theme: "Watch-Privacy" },
  { ticker: "RAIL", name: "Railgun", theme: "Watch-Privacy" },
  { ticker: "NAM", name: "Namada", theme: "Watch-Privacy" },
  { ticker: "ONDO", name: "Ondo Finance", theme: "Watch-RWA" },
  { ticker: "CFG", name: "Centrifuge", theme: "Watch-RWA" },
  { ticker: "SYRUP", name: "Maple Finance", theme: "Watch-RWA" },
  { ticker: "ENA", name: "Ethena", theme: "Watch-RWA" },
  { ticker: "JUP", name: "Jupiter", theme: "Watch-Solana" },
  { ticker: "JTO", name: "Jito", theme: "Watch-Solana" },
  { ticker: "KMNO", name: "Kamino", theme: "Watch-Solana" },
];

const THEMES = [
  "All",
  "Portfolio",
  "Watch-Core",
  "Watch-AI",
  "Watch-Privacy",
  "Watch-RWA",
  "Watch-Solana",
];

export default function ResearchPage() {
  const { data: session, status } = useSession();
  const [theme, setTheme] = useState<string>("All");
  const [protocol, setProtocol] = useState<string>("");
  const [focusPrompt, setFocusPrompt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; stub?: boolean } | null>(null);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      window.location.href = "/";
    }
  }, [status, isAdmin]);

  const visibleProtocols = theme === "All" ? PROTOCOLS : PROTOCOLS.filter((p) => p.theme === theme);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!protocol || !focusPrompt.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/research/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol,
          focus_prompt: focusPrompt.trim(),
          requested_by: session?.user?.email || "unknown",
          requested_at: new Date().toISOString(),
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (res.ok) {
        setResult({
          ok: true,
          message: body.message || "Deep dive queued",
          stub: body.stub === true,
        });
        setFocusPrompt("");
      } else {
        setResult({
          ok: false,
          message: body.error || `Error: ${res.status}`,
        });
      }
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[14px] text-moria-light">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[14px] text-moria-dim">Access denied</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-copper text-[10px] font-mono uppercase tracking-widest mb-1">
          Gandalf &middot; Deep Research
        </p>
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-moria-black leading-none">
          Run Deep Dive
        </h1>
        <p className="text-[13px] text-moria-dim mt-2 font-serif">
          Triggers a 5-page decision memo. The research committee reads all current agent outputs
          (Ori positions, Gimli valuations, Thorin governance, Aragorn news, Elrond macro) plus
          any existing archive memos, then answers exactly one question: <em>should we invest, and
          why or why not?</em>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Theme filter */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-widest text-copper mb-2">
            Filter by theme
          </label>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`px-3 py-1.5 rounded border text-[11px] font-mono transition-colors ${
                  theme === t
                    ? "bg-copper text-white border-copper"
                    : "bg-white text-moria-dim border-moria-rule hover:border-copper"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Protocol dropdown */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-widest text-copper mb-2">
            Protocol
          </label>
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-moria-rule bg-white text-[14px] text-moria-black focus:border-copper focus:outline-none transition-colors"
          >
            <option value="">-- select a protocol --</option>
            {visibleProtocols.map((p) => (
              <option key={p.ticker} value={p.ticker}>
                {p.ticker} &middot; {p.name} ({p.theme})
              </option>
            ))}
          </select>
        </div>

        {/* Focus prompt textarea */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-widest text-copper mb-2">
            Focus prompt
          </label>
          <p className="text-[11px] text-moria-light mb-2 font-serif italic">
            What specific angle should Gandalf focus on? Examples:
            &quot;Is the fee switch meaningfully flowing to token holders yet?&quot;,
            &quot;Should we exit or add given Trafigura&apos;s new mining deals?&quot;,
            &quot;Compare P/E discipline vs structural moat&quot;.
          </p>
          <textarea
            value={focusPrompt}
            onChange={(e) => setFocusPrompt(e.target.value)}
            required
            rows={4}
            placeholder="Gandalf will answer this question with a 5-page decision memo..."
            className="w-full px-4 py-3 rounded-lg border border-moria-rule bg-white text-[13px] text-moria-black focus:border-copper focus:outline-none transition-colors font-serif resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-moria-light font-mono">
            {focusPrompt.length > 0 && `${focusPrompt.length} chars`}
          </div>
          <button
            type="submit"
            disabled={submitting || !protocol || !focusPrompt.trim()}
            className="px-6 py-3 rounded-lg bg-moria-black text-white text-[13px] font-mono uppercase tracking-wide hover:bg-moria-body transition-colors disabled:bg-moria-rule disabled:cursor-not-allowed"
          >
            {submitting ? "Queuing..." : "Run Gandalf"}
          </button>
        </div>
      </form>

      {/* Result banner */}
      {result && (
        <div
          className={`mt-6 card p-5 border-l-4 ${
            result.ok ? "border-moria-pos" : "border-moria-neg"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                result.ok ? "bg-moria-pos" : "bg-moria-neg"
              }`}
            />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-moria-black">
                {result.ok ? "Request queued" : "Request failed"}
              </p>
              <p className="text-[12px] text-moria-dim mt-1">{result.message}</p>
              {result.stub && (
                <div className="mt-3 pt-3 border-t border-moria-rule/40">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-copper mb-1">
                    Wave 1 stub mode
                  </p>
                  <p className="text-[12px] text-moria-dim">
                    Gandalf wiring activates in Wave 2. Once <code className="font-mono text-copper">ANTHROPIC_API_KEY</code> is
                    set and the Remote Trigger hook is configured, clicking Run Gandalf will spawn
                    a Claude Code session on the admin&apos;s Mac (using Max subscription,
                    free at point of use), run the 5-page decision memo, and publish it to{" "}
                    <code className="font-mono">/research</code>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="mt-8 card p-5 bg-moria-faint/30">
        <p className="text-[10px] font-mono uppercase tracking-widest text-copper mb-2">
          How Gandalf deep dives work
        </p>
        <ul className="space-y-2 text-[12px] text-moria-dim font-serif">
          <li>
            1. <span className="font-semibold text-moria-black">Grounded in data.</span>
            &nbsp;Reads current Ori, Gimli, Thorin, Aragorn, Elrond JSON outputs — no training
            knowledge, no hallucination.
          </li>
          <li>
            2. <span className="font-semibold text-moria-black">5-page decision memo.</span>
            &nbsp;Thesis (2 sentences) · Why now · Valuation vs peers · Top 3 risks · BUY/PASS/MONITOR with conviction score.
          </li>
          <li>
            3. <span className="font-semibold text-moria-black">Free under Max.</span>
            &nbsp;Runs on the admin&apos;s Mac via Claude Code (Max subscription covers all Opus tokens).
          </li>
          <li>
            4. <span className="font-semibold text-moria-black">Published to /research.</span>
            &nbsp;Memo commits to the repo, Vercel redeploys, LPs see it automatically.
          </li>
        </ul>
      </div>
    </div>
  );
}
