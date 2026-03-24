import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold tracking-widest text-primary">
          MORIA CAPITAL
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Investor Portal</p>

        <div className="mt-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <svg
              className="h-6 w-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Check your email
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a login link to your email address. Click the link to sign
            in.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            The link expires in 24 hours.
          </p>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder, or contact the fund
          administrator.
        </p>

        <Link
          href="/auth/signin"
          className="mt-6 inline-block text-sm text-primary hover:underline"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
