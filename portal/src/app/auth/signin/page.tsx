"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("email", {
        email,
        callbackUrl,
        redirect: false,
      });

      if (res?.error) {
        setError("Email not on the investor whitelist.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-5">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <svg width="48" height="42" viewBox="0 0 48 42" fill="none" className="mb-5">
              <polygon points="24,2 46,40 2,40" fill="none" stroke="#6B3620" strokeWidth="1.4"/>
              <polygon points="24,12 37,40 11,40" fill="none" stroke="#6B3620" strokeWidth="0.6" opacity="0.38"/>
            </svg>
            <h1 className="font-serif text-[15px] font-bold uppercase tracking-[0.25em]" style={{ color: "var(--black)" }}>
              Moria Capital
            </h1>
            <p className="font-serif text-[13px] mt-1" style={{ color: "var(--dim)" }}>
              Conclave Portal
            </p>
          </div>

          <hr className="thick-rule mb-8" />

          <div className="text-center">
            <h2 className="font-serif text-[18px]" style={{ color: "var(--black)" }}>
              Check your email
            </h2>
            <p className="font-serif text-[14px] mt-3 leading-relaxed" style={{ color: "var(--dim)" }}>
              We sent a login link to{" "}
              <span style={{ color: "var(--black)" }}>{email}</span>.
              <br />
              Click the link to sign in.
            </p>
          </div>

          <p className="mt-8 text-center font-serif text-[12px] italic" style={{ color: "var(--light)" }}>
            Commodities AG &middot; Zug, Switzerland
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <svg width="48" height="42" viewBox="0 0 48 42" fill="none" className="mb-5">
            <polygon points="24,2 46,40 2,40" fill="none" stroke="#6B3620" strokeWidth="1.4"/>
            <polygon points="24,12 37,40 11,40" fill="none" stroke="#6B3620" strokeWidth="0.6" opacity="0.38"/>
          </svg>
          <h1 className="font-serif text-[15px] font-bold uppercase tracking-[0.25em]" style={{ color: "var(--black)" }}>
            Moria Capital
          </h1>
          <p className="font-serif text-[13px] mt-1" style={{ color: "var(--dim)" }}>
            Conclave Portal
          </p>
        </div>

        <hr className="thick-rule mb-8" />

        <h2 className="text-center font-serif text-[18px] mb-6" style={{ color: "var(--black)" }}>
          Sign In
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 font-serif text-[14px]"
            style={{
              border: "0.5px solid var(--rule)",
              background: "var(--white)",
              color: "var(--body)",
              outline: "none",
            }}
          />

          {error && (
            <p className="font-serif text-[13px]" style={{ color: "var(--neg)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full px-4 py-3 font-serif text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--black)",
              color: "var(--white)",
              border: "none",
            }}
          >
            {loading ? "Sending..." : "Continue"}
          </button>
        </form>

        <p className="mt-8 text-center font-serif text-[12px] italic" style={{ color: "var(--light)" }}>
          Commodities AG &middot; Zug, Switzerland
        </p>
      </div>
    </div>
  );
}
