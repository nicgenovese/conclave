import { WhitelistUser } from "./types";

// ===========================================================
// Whitelist — managed via WHITELIST env var on Vercel
// Format: "email:role:name,email:role:name,..."
// Example: "niclas@gmail.com:admin:Niclas,lp@fund.com:investor:LP Name"
//
// If no env var, falls back to hardcoded defaults (you two)
// ===========================================================

const DEFAULT_USERS: WhitelistUser[] = [
  { email: "niclas.nfstudio@gmail.com", role: "admin", name: "Niclas", addedAt: "2026-03-25" },
];

function parseWhitelistEnv(): WhitelistUser[] {
  const raw = process.env.WHITELIST;
  if (!raw) return DEFAULT_USERS;

  try {
    return raw.split(",").map((entry) => {
      const [email, role, name] = entry.trim().split(":");
      return {
        email: email.toLowerCase(),
        role: (role as "admin" | "investor") || "investor",
        name: name || email.split("@")[0],
        addedAt: "2026-03-25",
      };
    });
  } catch {
    console.error("[DB] Failed to parse WHITELIST env var");
    return DEFAULT_USERS;
  }
}

let cachedUsers: WhitelistUser[] | null = null;

function getUsers(): WhitelistUser[] {
  if (!cachedUsers) {
    cachedUsers = parseWhitelistEnv();
    console.log(`[DB] Whitelist: ${cachedUsers.length} users loaded`);
  }
  return cachedUsers;
}

export function getWhitelist(): WhitelistUser[] {
  return getUsers();
}

export function getUserByEmail(email: string): WhitelistUser | undefined {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserRole(email: string): string | null {
  const user = getUserByEmail(email);
  return user ? user.role : null;
}

export function isWhitelisted(email: string): boolean {
  return getUserByEmail(email) !== undefined;
}
