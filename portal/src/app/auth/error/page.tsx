"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Access Denied",
    description:
      "Your email is not on the investor whitelist. Contact the fund administrator for access.",
  },
  Verification: {
    title: "Link Expired",
    description:
      "The login link has expired or has already been used. Please request a new one.",
  },
};

const DEFAULT_ERROR = {
  title: "Sign In Error",
  description: "An error occurred during sign in. Please try again.",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const errorType = searchParams.get("error") || "";
  const { title, description } = ERROR_MESSAGES[errorType] || DEFAULT_ERROR;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold tracking-widest text-primary">
          MORIA CAPITAL
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Investor Portal</p>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-destructive">{title}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        </div>

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
