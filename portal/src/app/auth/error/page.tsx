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
          <h2 className="font-serif text-[18px]" style={{ color: "var(--neg)" }}>
            {title}
          </h2>
          <p className="font-serif text-[14px] mt-3 leading-relaxed" style={{ color: "var(--dim)" }}>
            {description}
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/auth/signin"
            className="font-serif text-[14px] hover:underline"
            style={{ color: "var(--copper)" }}
          >
            Back to Sign In
          </Link>
        </div>

        <p className="mt-8 text-center font-serif text-[12px] italic" style={{ color: "var(--light)" }}>
          Commodities AG &middot; Zug, Switzerland
        </p>
      </div>
    </div>
  );
}
