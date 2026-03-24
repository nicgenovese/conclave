"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold tracking-widest text-primary">
          MORIA CAPITAL
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to Conclave Portal
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="mt-8 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in with Google
        </button>

        <p className="mt-6 text-xs text-muted-foreground">
          Access restricted to whitelisted investors
        </p>
      </div>
    </div>
  );
}
