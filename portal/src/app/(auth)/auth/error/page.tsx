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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFFFFF",
        padding: "24px",
        fontFamily: "'Times New Roman', Georgia, serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "380px", textAlign: "center" }}>
        <svg width="56" height="49" viewBox="0 0 48 42" fill="none" style={{ marginBottom: "20px" }}>
          <polygon points="24,2 46,40 2,40" fill="none" stroke="#6B3620" strokeWidth="1.4" />
          <polygon points="24,12 37,40 11,40" fill="none" stroke="#6B3620" strokeWidth="0.6" opacity="0.38" />
        </svg>
        <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.28em", color: "#0A0A0A", textTransform: "uppercase" as const, marginBottom: "6px" }}>
          Moria Capital
        </div>
        <div style={{ borderTop: "1.5px solid #0A0A0A", margin: "32px 0" }} />
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#7A2828", marginBottom: "12px" }}>{title}</h2>
        <p style={{ fontSize: "14px", color: "#505050", lineHeight: "1.7", marginBottom: "32px" }}>{desc}</p>
        <Link href="/auth/signin" style={{ fontSize: "14px", color: "#6B3620", textDecoration: "none", borderBottom: "0.5px solid #6B3620", paddingBottom: "2px" }}>
          Back to Sign In
        </Link>
        <div style={{ borderTop: "0.5px solid #CCCAC6", margin: "40px 0 20px" }} />
        <div style={{ fontSize: "11px", color: "#909090", fontStyle: "italic" }}>Moria Capital AG &middot; Zug, Switzerland</div>
      </div>
    </div>
  );
}
