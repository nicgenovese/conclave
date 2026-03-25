"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    padding: "14px 16px",
    fontFamily: "'Times New Roman', Georgia, serif",
    fontSize: "15px",
    color: "#222222",
    background: "#FFFFFF",
    border: focusedField === field ? "1px solid #6B3620" : "1px solid #CCCAC6",
    outline: "none",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box",
  });

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
      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Apex Logo */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <svg
            width="56"
            height="49"
            viewBox="0 0 48 42"
            fill="none"
            style={{ marginBottom: "20px" }}
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
          <div
            style={{
              fontFamily: "'Times New Roman', Georgia, serif",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.28em",
              color: "#0A0A0A",
              textTransform: "uppercase",
            }}
          >
            Moria Capital
          </div>
          <div
            style={{
              fontFamily: "'Times New Roman', Georgia, serif",
              fontSize: "12px",
              color: "#909090",
              marginTop: "6px",
              fontStyle: "italic",
            }}
          >
            Investor Portal
          </div>
        </div>

        {/* Thick Rule */}
        <div
          style={{
            borderTop: "1.5px solid #0A0A0A",
            marginBottom: "36px",
          }}
        />

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B3620",
                marginBottom: "8px",
              }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              placeholder="you@example.com"
              autoComplete="email"
              style={inputStyle("email")}
            />
          </div>

          {/* Passphrase */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B3620",
                marginBottom: "8px",
              }}
            >
              Passphrase
            </label>
            <input
              type="password"
              required
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onFocus={() => setFocusedField("passphrase")}
              onBlur={() => setFocusedField(null)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputStyle("passphrase")}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                fontFamily: "'Times New Roman', Georgia, serif",
                fontSize: "13px",
                color: "#7A2828",
                marginBottom: "16px",
                paddingLeft: "2px",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !passphrase}
            style={{
              width: "100%",
              padding: "14px",
              fontFamily: "'Times New Roman', Georgia, serif",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "#FFFFFF",
              background: loading || !email || !passphrase ? "#CCCAC6" : "#0A0A0A",
              border: "none",
              cursor: loading ? "wait" : loading || !email || !passphrase ? "not-allowed" : "pointer",
              transition: "background 0.2s ease",
              textTransform: "uppercase",
            }}
          >
            {loading ? "Authenticating..." : "Enter"}
          </button>
        </form>

        {/* Hairline */}
        <div
          style={{
            borderTop: "0.5px solid #CCCAC6",
            marginTop: "40px",
            marginBottom: "20px",
          }}
        />

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            fontFamily: "'Times New Roman', Georgia, serif",
            fontSize: "11px",
            color: "#909090",
            fontStyle: "italic",
            lineHeight: "1.6",
          }}
        >
          Moria Capital AG &middot; Zug, Switzerland
        </div>
      </div>
    </div>
  );
}
