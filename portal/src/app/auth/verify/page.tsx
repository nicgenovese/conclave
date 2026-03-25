import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyRequestPage() {
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
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Check your inbox
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We sent a login link to your email.
            <br />
            Click the link to sign in.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            The link expires in 24 hours.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder.
        </p>

        <div className="mt-4 text-center">
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
