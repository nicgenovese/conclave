import fs from "fs";
import path from "path";
import { WhitelistData, WhitelistUser } from "./types";

const WHITELIST_PATH = path.join(process.cwd(), "data", "whitelist.json");

function readWhitelist(): WhitelistData {
  try {
    const raw = fs.readFileSync(WHITELIST_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { users: [] };
  }
}

function writeWhitelist(data: WhitelistData): void {
  fs.writeFileSync(WHITELIST_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getWhitelist(): WhitelistUser[] {
  return readWhitelist().users;
}

export function getUserByEmail(email: string): WhitelistUser | undefined {
  return readWhitelist().users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}

export function getUserRole(email: string): string | null {
  const user = getUserByEmail(email);
  return user ? user.role : null;
}

export function isWhitelisted(email: string): boolean {
  return getUserByEmail(email) !== undefined;
}

export function addUser(
  email: string,
  role: "admin" | "investor",
  name?: string
): WhitelistUser {
  const data = readWhitelist();
  const existing = data.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    existing.role = role;
    if (name) existing.name = name;
    writeWhitelist(data);
    return existing;
  }
  const newUser: WhitelistUser = {
    email: email.toLowerCase(),
    role,
    addedAt: new Date().toISOString().split("T")[0],
    ...(name ? { name } : {}),
  };
  data.users.push(newUser);
  writeWhitelist(data);
  return newUser;
}

export function removeUser(email: string): boolean {
  const data = readWhitelist();
  const idx = data.users.findIndex(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (idx === -1) return false;
  data.users.splice(idx, 1);
  writeWhitelist(data);
  return true;
}
