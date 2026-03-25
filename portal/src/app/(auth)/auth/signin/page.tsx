"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        passphrase,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid credentials. Check your email and passphrase.");
        setLoading(false);
        return;
      }

      if (res?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <svg width="48" height="42" viewBox="0 0 48 42" fill="none" className="mb-5">
            <polygon points="24,2 46,40 2,40" fill="none" stroke="#6B3620" strokeWidth="1.4"/>
            <polygon points="24,12 37,40 11,40" fill="none" stroke="#6B3620" strokeWidth="0.6" opacity="0.38"/>
          </svg>
          <h1 className="font-serif text-[15px] font-bold uppercase tracking-[0.25em]" style={{ color: "#0A0A0A" }}>
            Moria Capital
          </h1>
          <p className="font-serif text-[13px] mt-1" style={{ color: "#505050" }}>
            Conclave Portal
          </p>
        </div>

        <hr style={{ border: "none", borderTop: "1.5px solid #0A0A0A", marginBottom: "32px" }} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.16em] mb-2" style={{ color: "#6B3620" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 font-serif text-[14px]"
              style={{
                border: "0.5px solid #CCCAC6",
                background: "#FFFFFF",
                color: "#222222",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.16em] mb-2" style={{ color: "#6B3620" }}>
              Passphrase
            </label>
            <input
              type="password"
              required
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              autoComplete="current-password"
              className="w-full px-4 py-3 font-serif text-[14px]"
              style={{
                border: "0.5px solid #CCCAC6",
                background: "#FFFFFF",
                color: "#222222",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <p className="font-serif text-[13px]" style={{ color: "#7A2828" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !passphrase}
            className="w-full px-4 py-3 font-serif text-[14px] mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "#0A0A0A",
              color: "#FFFFFF",
              border: "none",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Enter"}
          </button>
        </form>

        <p className="mt-10 text-center font-serif text-[12px] italic" style={{ color: "#909090" }}>
          Moria Capital AG &middot; Zug, Switzerland
        </p>
      </div>
    </div>
  );
}
