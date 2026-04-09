import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-5">
      <div className="card p-8 sm:p-10 max-w-[400px] w-full animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <svg width="48" height="42" viewBox="0 0 48 42" fill="none" className="mb-5">
            <polygon points="24,2 46,40 2,40" fill="none" stroke="#6B3620" strokeWidth="1.4"/>
            <polygon points="24,12 37,40 11,40" fill="none" stroke="#6B3620" strokeWidth="0.6" opacity="0.38"/>
          </svg>
          <h1 className="font-serif text-[15px] font-bold uppercase tracking-[0.25em] text-moria-black">
            Moria Capital
          </h1>
          <p className="text-[13px] mt-1 text-moria-dim">
            Conclave Portal
          </p>
        </div>

        <div className="border-t-[1.5px] border-moria-black mb-8" />

        <div className="text-center">
          <h2 className="font-serif text-[18px] text-moria-black">
            Check your email
          </h2>
          <p className="text-[14px] mt-3 leading-relaxed text-moria-dim">
            We sent a login link to your email.
            <br />
            Click the link to sign in.
          </p>
          <p className="text-[12px] mt-3 text-moria-light">
            The link expires in 24 hours.
          </p>
        </div>

        <p className="mt-6 text-center text-[12px] text-moria-light">
          Didn&apos;t receive it? Check your spam folder.
        </p>

        <div className="mt-4 text-center">
          <Link
            href="/auth/signin"
            className="text-copper text-[13px] hover:underline"
          >
            Back to sign in
          </Link>
        </div>

        <p className="mt-8 text-center text-[12px] italic text-moria-light">
          Moria Capital AG &middot; Zug, Switzerland
        </p>
      </div>
    </div>
  );
}
