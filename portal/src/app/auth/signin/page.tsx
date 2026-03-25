"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";

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
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-12">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-sm font-light uppercase tracking-[0.3em] text-foreground">
              Moria
            </span>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
            <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Check your email
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We sent a login link to{" "}
              <span className="text-foreground">{email}</span>.
              <br />
              Click the link to sign in.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-sm font-light uppercase tracking-[0.3em] text-foreground">
            Moria
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card p-8">
          <h2 className="text-center text-lg font-semibold text-foreground">
            Sign in
          </h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Enter your email to continue
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Continue"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access restricted to whitelisted investors
        </p>
      </div>
    </div>
  );
}
