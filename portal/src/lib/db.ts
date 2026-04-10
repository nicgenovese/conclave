import fs from "fs";
import path from "path";
import { WhitelistUser } from "./types";

// ===========================================================
// Whitelist — two sources, merged:
//
// 1. portal/data/whitelist.json (file, writable in dev)
// 2. WHITELIST env var (format: "email:role:name,email:role:name")
// 3. Hardcoded defaults (fallback)
//
// The file takes precedence if it exists.
// On Vercel serverless, the file is read-only but can be seeded
// at build time by committing it to the repo.
// ===========================================================

const WHITELIST_FILE = path.join(process.cwd(), "data", "whitelist.json");

const DEFAULT_USERS: WhitelistUser[] = [
  { email: "niclas.nfstudio@gmail.com", role: "admin", name: "Niclas", addedAt: "2026-03-25" },
];

function readWhitelistFile(): WhitelistUser[] | null {
  try {
    if (!fs.existsSync(WHITELIST_FILE)) return null;
    const raw = fs.readFileSync(WHITELIST_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const users = Array.isArray(parsed?.users) ? parsed.users : Array.isArray(parsed) ? parsed : null;
    if (!users || users.length === 0) return null;

    // Normalize
    return users.map((u: Partial<WhitelistUser>) => ({
      email: (u.email || "").toLowerCase(),
      role: (u.role as "admin" | "investor") || "investor",
      name: u.name || (u.email || "").split("@")[0],
      addedAt: u.addedAt || "2026-03-25",
    }));
  } catch (err) {
    console.error("[DB] Failed to read whitelist.json:", err);
    return null;
  }
}

function parseWhitelistEnv(): WhitelistUser[] | null {
  const raw = process.env.WHITELIST;
  if (!raw) return null;

  try {
    const users = raw.split(",").map((entry) => {
      const [email, role, name] = entry.trim().split(":");
      return {
        email: (email || "").toLowerCase(),
        role: (role as "admin" | "investor") || "investor",
        name: name || (email || "").split("@")[0],
        addedAt: "2026-03-25",
      };
    });
    return users.filter((u) => u.email);
  } catch (err) {
    console.error("[DB] Failed to parse WHITELIST env var:", err);
    return null;
  }
}

let cachedUsers: WhitelistUser[] | null = null;

function loadUsers(): WhitelistUser[] {
  // 1. File (writable in dev, seed in prod)
  const fromFile = readWhitelistFile();
  if (fromFile && fromFile.length > 0) {
    console.log(`[DB] Whitelist loaded from file: ${fromFile.length} users`);
    return fromFile;
  }

  // 2. Env var (production fallback)
  const fromEnv = parseWhitelistEnv();
  if (fromEnv && fromEnv.length > 0) {
    console.log(`[DB] Whitelist loaded from env: ${fromEnv.length} users`);
    return fromEnv;
  }

  // 3. Defaults (Niclas only)
  console.log(`[DB] Whitelist using defaults: ${DEFAULT_USERS.length} users`);
  return DEFAULT_USERS;
}

function getUsers(): WhitelistUser[] {
  if (!cachedUsers) {
    cachedUsers = loadUsers();
  }
  return cachedUsers;
}

// Call after writing to the file so changes take effect immediately
export function clearWhitelistCache(): void {
  cachedUsers = null;
}

export function getWhitelist(): WhitelistUser[] {
  return getUsers();
}

export function getUserByEmail(email: string): WhitelistUser | undefined {
  if (!email) return undefined;
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserRole(email: string): string | null {
  const user = getUserByEmail(email);
  return user ? user.role : null;
}

export function isWhitelisted(email: string): boolean {
  return getUserByEmail(email) !== undefined;
}
