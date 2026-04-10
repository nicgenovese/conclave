/**
 * POST /api/research/trigger
 *
 * Admin-only endpoint that queues a Gandalf deep-dive request.
 *
 * Wave 1: writes the request to portal/data/pending-gandalf-runs.json.
 *         Returns a stub success with a message explaining Wave 2 activation.
 *
 * Wave 2: this will POST to a Remote Trigger URL that spawns a Claude Code
 *         session on the admin's Mac with `claude -p "/conclave <protocol> <prompt>"`.
 *         The session runs the committee, writes the memo to archive/memos/,
 *         commits to git, and Vercel auto-redeploys.
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

const PENDING_RUNS_FILE = path.join(process.cwd(), "data", "pending-gandalf-runs.json");

interface PendingRun {
  id: string;
  protocol: string;
  focus_prompt: string;
  requested_by: string;
  requested_at: string;
  status: "pending" | "running" | "completed" | "failed";
}

function readPendingRuns(): PendingRun[] {
  try {
    if (!fs.existsSync(PENDING_RUNS_FILE)) return [];
    const raw = fs.readFileSync(PENDING_RUNS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.runs) ? parsed.runs : [];
  } catch {
    return [];
  }
}

function writePendingRuns(runs: PendingRun[]) {
  const dir = path.dirname(PENDING_RUNS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PENDING_RUNS_FILE, JSON.stringify({ runs }, null, 2), "utf-8");
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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { protocol, focus_prompt, requested_by, requested_at } = body as {
      protocol?: string;
      focus_prompt?: string;
      requested_by?: string;
      requested_at?: string;
    };

    if (!protocol || typeof protocol !== "string") {
      return NextResponse.json({ error: "protocol required" }, { status: 400 });
    }
    if (!focus_prompt || typeof focus_prompt !== "string" || focus_prompt.trim().length < 5) {
      return NextResponse.json(
        { error: "focus_prompt required (at least 5 chars)" },
        { status: 400 }
      );
    }

    const newRun: PendingRun = {
      id: `${protocol.toLowerCase()}-${Date.now()}`,
      protocol,
      focus_prompt: focus_prompt.trim(),
      requested_by: requested_by || session.user?.email || "unknown",
      requested_at: requested_at || new Date().toISOString(),
      status: "pending",
    };

    // Try to persist the pending run
    try {
      const current = readPendingRuns();
      current.push(newRun);
      writePendingRuns(current);

      return NextResponse.json({
        ok: true,
        message:
          "Deep dive queued. Wave 1 stub mode — no trigger has been fired yet. The request is saved; Wave 2 will activate the Remote Trigger that spawns Claude Code on the admin's Mac.",
        stub: true,
        run_id: newRun.id,
      });
    } catch (writeErr) {
      if (isReadOnlyFs(writeErr)) {
        // Vercel production — filesystem is read-only
        return NextResponse.json(
          {
            ok: true,
            message:
              "Vercel filesystem is read-only, so the request could not be saved to portal/data. In Wave 2 the trigger will fire directly to the admin's Mac without needing filesystem writes.",
            stub: true,
            readonly: true,
          },
          { status: 200 }
        );
      }
      throw writeErr;
    }
  } catch (err) {
    console.error("[api/research/trigger] error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
