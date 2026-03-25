import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { isWhitelisted, getUserRole, getUserByEmail } from "./db";

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
// The passphrase — Marc Rich insiders only
// "The King of Oil" — his biography, founding year, founding city
// ============================================
const PORTAL_PASSPHRASE = process.env.PORTAL_PASSPHRASE || "Zug1974";

// ============================================
// Auth config — Email + passphrase credentials
// ============================================
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        passphrase: { label: "Passphrase", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.passphrase) {
          return null;
        }

        // Check passphrase
        if (credentials.passphrase !== PORTAL_PASSPHRASE) {
          return null;
        }

        // Check whitelist
        if (!isWhitelisted(credentials.email)) {
          return null;
        }

        const user = getUserByEmail(credentials.email);
        return {
          id: credentials.email,
          email: credentials.email,
          name: user?.name || credentials.email.split("@")[0],
        };
      },
    }),
  ],
  callbacks: {
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
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
};
