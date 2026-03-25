"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

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
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
