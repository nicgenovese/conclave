import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { isWhitelisted, getUserRole } from "./db";

// ============================================
// Validate required env vars at module load
// ============================================
const REQUIRED_AUTH_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXTAUTH_SECRET",
] as const;

for (const varName of REQUIRED_AUTH_VARS) {
  if (!process.env[varName]) {
    console.warn(
      `[AUTH] WARNING: ${varName} is not set. Auth will not work.`
    );
  }
}

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
// Auth config
// ============================================
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
  },
  secret: process.env.NEXTAUTH_SECRET,
};
