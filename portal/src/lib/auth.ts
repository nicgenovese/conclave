import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { isWhitelisted, getUserRole, getUserByEmail } from "./db";

// ============================================
// Validate required env vars at module load
// ============================================
const REQUIRED_VARS = ["NEXTAUTH_SECRET", "RESEND_API_KEY"] as const;

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    console.error(`[AUTH] WARNING: ${key} is not set. Auth will not work.`);
  }
}

// Only create Resend client if API key exists (prevents crash during build)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// ============================================
// Type augmentation
// ============================================
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}

// ============================================
// Auth config — Email magic links via Resend
// ============================================
export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM || "Conclave <onboarding@resend.dev>",
      sendVerificationRequest: async ({ identifier: email, url }) => {
        // Check whitelist BEFORE sending email
        if (!isWhitelisted(email)) {
          throw new Error("Email not whitelisted");
        }

        const user = getUserByEmail(email);
        const name = user?.name || "Investor";

        if (!resend) {
          console.error("[AUTH] RESEND_API_KEY not set — cannot send magic link");
          throw new Error("Email service not configured");
        }

        try {
          await resend.emails.send({
            from: process.env.EMAIL_FROM || "Conclave <onboarding@resend.dev>",
            to: email,
            subject: "Sign in to Conclave Portal",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h2 style="color: #1a1a2e; margin-bottom: 8px;">Moria Capital</h2>
                <p style="color: #666; font-size: 14px; margin-bottom: 32px;">Conclave Investor Portal</p>
                <p style="color: #333; font-size: 16px;">Hello ${name},</p>
                <p style="color: #333; font-size: 16px;">Click the button below to sign in to your investor portal:</p>
                <a href="${url}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0;">Sign In</a>
                <p style="color: #999; font-size: 13px; margin-top: 32px;">This link expires in 24 hours. If you didn't request this, ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="color: #999; font-size: 12px;">Moria Capital — DeFi-native value investing</p>
              </div>
            `,
          });
        } catch (error) {
          console.error("[AUTH] Failed to send magic link:", error);
          throw new Error("Failed to send verification email");
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return isWhitelisted(user.email);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.role = getUserRole(user.email) || "investor";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
