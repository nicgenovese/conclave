"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const ERRORS: Record<string, { title: string; desc: string }> = {
  AccessDenied: {
    title: "Access Denied",
    desc: "Your email is not on the investor whitelist. Contact the fund administrator.",
  },
  CredentialsSignin: {
    title: "Invalid Credentials",
    desc: "Check your email and passphrase, then try again.",
  },
};

const DEFAULT = {
  title: "Authentication Error",
  desc: "Something went wrong. Please try again.",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const errorType = searchParams.get("error") || "";
  const { title, desc } = ERRORS[errorType] || DEFAULT;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] p-6">
      <div className="card p-8 sm:p-10 max-w-[400px] w-full text-center">
        <svg width="56" height="49" viewBox="0 0 48 42" fill="none" className="mx-auto mb-5">
          <polygon points="24,2 46,40 2,40" fill="none" stroke="#6B3620" strokeWidth="1.4" />
          <polygon points="24,12 37,40 11,40" fill="none" stroke="#6B3620" strokeWidth="0.6" opacity="0.38" />
        </svg>
        <div className="font-serif text-[14px] font-bold uppercase tracking-[0.28em] text-moria-black mb-1.5">
          Moria Capital
        </div>

        <div className="border-t-[1.5px] border-moria-black my-8" />

        <h2 className="font-serif text-[20px] font-bold text-moria-neg mb-3">{title}</h2>
        <p className="text-[14px] text-moria-dim leading-relaxed mb-8">{desc}</p>

        <Link
          href="/auth/signin"
          className="text-copper text-[14px] hover:underline border-b border-copper pb-0.5"
        >
          Back to Sign In
        </Link>

        <div className="border-t border-moria-rule mt-10 mb-5" />
        <div className="text-[11px] text-moria-light italic">
          Moria Capital AG &middot; Zug, Switzerland
        </div>
      </div>
    </div>
  );
}
