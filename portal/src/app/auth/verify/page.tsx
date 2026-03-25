import Link from "next/link";

export default function VerifyRequestPage() {
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
          <h2 className="font-serif text-[18px]" style={{ color: "var(--black)" }}>
            Check your email
          </h2>
          <p className="font-serif text-[14px] mt-3 leading-relaxed" style={{ color: "var(--dim)" }}>
            We sent a login link to your email.
            <br />
            Click the link to sign in.
          </p>
          <p className="font-serif text-[12px] mt-3" style={{ color: "var(--light)" }}>
            The link expires in 24 hours.
          </p>
        </div>

        <p className="mt-6 text-center font-serif text-[12px]" style={{ color: "var(--light)" }}>
          Didn&apos;t receive it? Check your spam folder.
        </p>

        <div className="mt-4 text-center">
          <Link
            href="/auth/signin"
            className="font-serif text-[13px] hover:underline"
            style={{ color: "var(--copper)" }}
          >
            Back to sign in
          </Link>
        </div>

        <p className="mt-8 text-center font-serif text-[12px] italic" style={{ color: "var(--light)" }}>
          Commodities AG &middot; Zug, Switzerland
        </p>
      </div>
    </div>
  );
}
