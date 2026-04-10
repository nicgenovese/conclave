import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getWhitelist, clearWhitelistCache } from "@/lib/db";
import type { WhitelistUser } from "@/lib/types";
import fs from "fs";
import path from "path";

const WHITELIST_FILE = path.join(process.cwd(), "data", "whitelist.json");

// ============================================================
// Safe file read/write helpers
// ============================================================
function readWhitelistFile(): WhitelistUser[] {
  try {
    if (!fs.existsSync(WHITELIST_FILE)) return [];
    const raw = fs.readFileSync(WHITELIST_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.users)) return parsed.users;
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error("[whitelist] read error:", err);
    return [];
  }
}

function writeWhitelistFile(users: WhitelistUser[]): void {
  const dir = path.dirname(WHITELIST_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(WHITELIST_FILE, JSON.stringify({ users }, null, 2), "utf-8");
}

function isReadOnlyFs(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : "";
  return (
    msg.includes("EROFS") ||
    msg.includes("EACCES") ||
    msg.includes("read-only") ||
    msg.includes("ENOSPC")
  );
}

// ============================================================
// GET — list whitelist users
// ============================================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const whitelist = getWhitelist();
    return NextResponse.json({ users: whitelist });
  } catch (err) {
    console.error("[api/admin/whitelist] GET Error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST — add a user to the whitelist
// ============================================================
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const { email, role = "investor", name } = body as {
      email?: string;
      role?: "admin" | "investor";
      name?: string;
    };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (role !== "admin" && role !== "investor") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Load current state: prefer file, fall back to env/defaults via getWhitelist()
    const fromFile = readWhitelistFile();
    const current = fromFile.length > 0 ? fromFile : getWhitelist();

    // De-duplicate
    const existingIdx = current.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    const newUser: WhitelistUser = {
      email: email.toLowerCase(),
      role,
      name: name || email.split("@")[0],
      addedAt: new Date().toISOString().slice(0, 10),
    };

    let updated: WhitelistUser[];
    if (existingIdx >= 0) {
      // Update existing
      updated = [...current];
      updated[existingIdx] = newUser;
    } else {
      updated = [...current, newUser];
    }

    try {
      writeWhitelistFile(updated);
      clearWhitelistCache();

      return NextResponse.json({
        ok: true,
        users: updated,
        message: existingIdx >= 0 ? "User updated" : "User added",
        persistent: true,
      });
    } catch (writeErr) {
      if (isReadOnlyFs(writeErr)) {
        // Production Vercel — filesystem is read-only. Return the updated list
        // in-memory, but warn that it won't persist across serverless invocations.
        console.warn("[whitelist] read-only filesystem — cannot persist");
        return NextResponse.json(
          {
            error:
              "Cannot persist whitelist in production (read-only filesystem). " +
              "To add a user permanently: update the WHITELIST env var on Vercel and redeploy. " +
              "Format: email:role:name,email:role:name",
            readonly: true,
            generated_env_value: updated
              .map((u) => `${u.email}:${u.role}:${u.name || ""}`)
              .join(","),
          },
          { status: 503 }
        );
      }
      throw writeErr;
    }
  } catch (err) {
    console.error("[api/admin/whitelist] POST Error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE — remove a user from the whitelist
// ============================================================
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const { email } = body as { email?: string };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Safety: don't let admin remove themselves
    if (email.toLowerCase() === session.user?.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the whitelist" },
        { status: 400 }
      );
    }

    const fromFile = readWhitelistFile();
    const current = fromFile.length > 0 ? fromFile : getWhitelist();
    const updated = current.filter(
      (u) => u.email.toLowerCase() !== email.toLowerCase()
    );

    if (updated.length === current.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    try {
      writeWhitelistFile(updated);
      clearWhitelistCache();

      return NextResponse.json({
        ok: true,
        users: updated,
        message: "User removed",
      });
    } catch (writeErr) {
      if (isReadOnlyFs(writeErr)) {
        return NextResponse.json(
          {
            error:
              "Cannot persist whitelist in production (read-only filesystem). " +
              "To remove a user permanently: update the WHITELIST env var on Vercel and redeploy.",
            readonly: true,
            generated_env_value: updated
              .map((u) => `${u.email}:${u.role}:${u.name || ""}`)
              .join(","),
          },
          { status: 503 }
        );
      }
      throw writeErr;
    }
  } catch (err) {
    console.error("[api/admin/whitelist] DELETE Error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
