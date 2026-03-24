"use client";

import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Your email is not on the investor whitelist. Contact the fund
          administrator for access.
        </p>

        <Link
          href="/auth/signin"
          className="mt-8 inline-block rounded-md bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
