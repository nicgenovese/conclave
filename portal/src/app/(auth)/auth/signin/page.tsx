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
        setError("Invalid credentials.");
        setLoading(false);
        return;
      }

      if (res?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] p-6">
      <div className="card p-8 sm:p-10 max-w-[400px] w-full">
        {/* Apex Logo */}
        <div className="text-center mb-12">
          <svg
            width="56"
            height="49"
            viewBox="0 0 48 42"
            fill="none"
            className="mx-auto mb-5"
          >
            <polygon
              points="24,2 46,40 2,40"
              fill="none"
              stroke="#6B3620"
              strokeWidth="1.4"
            />
            <polygon
              points="24,12 37,40 11,40"
              fill="none"
              stroke="#6B3620"
              strokeWidth="0.6"
              opacity="0.38"
            />
          </svg>
          <div className="font-serif text-[14px] font-bold uppercase tracking-[0.28em] text-moria-black">
            Moria Capital
          </div>
          <div className="text-[12px] text-moria-light mt-1.5 italic">
            Investor Portal
          </div>
        </div>

        {/* Thick Rule */}
        <div className="border-t-[1.5px] border-moria-black mb-9" />

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-5">
            <label className="block text-copper text-[10px] font-mono uppercase tracking-widest mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3.5 rounded-lg border border-moria-rule focus:border-copper outline-none transition-colors text-[15px]"
            />
          </div>

          {/* Passphrase */}
          <div className="mb-6">
            <label className="block text-copper text-[10px] font-mono uppercase tracking-widest mb-2">
              Passphrase
            </label>
            <input
              type="password"
              required
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3.5 rounded-lg border border-moria-rule focus:border-copper outline-none transition-colors text-[15px]"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-moria-neg text-[13px] mb-4">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !passphrase}
            className="w-full py-3.5 rounded-lg bg-moria-black text-white font-medium uppercase text-sm tracking-wide hover:bg-moria-body transition-colors disabled:bg-moria-rule disabled:cursor-not-allowed"
          >
            {loading ? "Authenticating..." : "Enter"}
          </button>
        </form>

        {/* Hairline */}
        <div className="border-t border-moria-rule mt-10 mb-5" />

        {/* Footer */}
        <div className="text-center text-[11px] text-moria-light italic leading-relaxed">
          Moria Capital AG &middot; Zug, Switzerland
        </div>
      </div>
    </div>
  );
}
