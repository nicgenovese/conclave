#!/usr/bin/env tsx
/**
 * Gandalf Pending-Runs Queue Checker
 *
 * This script implements the "Queue-and-Forget" pattern for the portal's
 * /admin/research deep-dive trigger.
 *
 * Flow:
 *   1. An admin (you or JJ) opens conclave01.vercel.app/admin/research
 *   2. They pick a protocol and type a focus prompt, then click Run Gandalf
 *   3. The portal's /api/research/trigger endpoint writes the request to
 *      portal/data/pending-gandalf-runs.json
 *   4. (Periodically) you run `git pull` to sync the request to your Mac
 *   5. Run this script: `npx tsx scripts/check-pending-gandalf.ts`
 *   6. It prints any pending requests with the admin's focus prompt,
 *      and tells Claude Code what to run — then YOU execute /conclave
 *      in your Claude Code session with the suggested arguments.
 *
 * Usage inside a Claude Code session:
 *   You: npx tsx scripts/check-pending-gandalf.ts
 *   (script prints pending requests)
 *   You: /conclave PENDLE fee switch impact on our position
 *   (Claude runs the Conclave skill, produces the memo)
 *
 * This keeps Gandalf runs explicit and auditable — no silent magic
 * triggers, no always-on daemon, no hooks — just a simple queue
 * you drain whenever you start your morning in Claude Code.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PENDING_PATH = resolve(__dirname, "../portal/data/pending-gandalf-runs.json");

interface PendingRun {
  id: string;
  protocol: string;
  focus_prompt: string;
  requested_by: string;
  requested_at: string;
  status: "pending" | "running" | "completed" | "failed";
  completed_memo_path?: string;
}

interface PendingRunsFile {
  runs: PendingRun[];
}

function readPending(): PendingRunsFile {
  try {
    if (!existsSync(PENDING_PATH)) return { runs: [] };
    const raw = readFileSync(PENDING_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { runs: Array.isArray(parsed?.runs) ? parsed.runs : [] };
  } catch (err) {
    console.error(`Could not read ${PENDING_PATH}: ${err instanceof Error ? err.message : err}`);
    return { runs: [] };
  }
}

function writePending(data: PendingRunsFile): void {
  writeFileSync(PENDING_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  } catch {
    return iso;
  }
}

function main() {
  const action = process.argv[2]; // "list" (default), "mark-running <id>", "mark-completed <id> <memo_path>", "clear"

  const data = readPending();
  const pending = data.runs.filter((r) => r.status === "pending");
  const running = data.runs.filter((r) => r.status === "running");
  const completed = data.runs.filter((r) => r.status === "completed");

  // ───────── list (default) ─────────
  if (!action || action === "list") {
    console.log("");
    console.log("╔═══════════════════════════════════════════════════════╗");
    console.log("║      Gandalf Queue — Pending Deep-Dive Requests       ║");
    console.log("╚═══════════════════════════════════════════════════════╝");
    console.log("");
    console.log(
      `  ${pending.length} pending · ${running.length} running · ${completed.length} completed`,
    );
    console.log("");

    if (pending.length === 0 && running.length === 0) {
      console.log("  No pending Gandalf runs. Queue is empty.");
      console.log("");
      console.log("  To queue a run:");
      console.log("    1. Open https://conclave01.vercel.app/admin/research (admin login)");
      console.log("    2. Pick a protocol + type a focus prompt");
      console.log("    3. Click Run Gandalf");
      console.log("    4. `git pull` here, then re-run this script");
      console.log("");
      process.exit(0);
    }

    if (pending.length > 0) {
      console.log("━━━ PENDING ━━━");
      for (const r of pending) {
        console.log("");
        console.log(`  [${r.id}]`);
        console.log(`  Protocol:     ${r.protocol}`);
        console.log(`  Requested by: ${r.requested_by} (${relativeTime(r.requested_at)})`);
        console.log(`  Focus prompt: ${r.focus_prompt}`);
        console.log("");
        console.log(`  To run in Claude Code:`);
        console.log(`    /conclave ${r.protocol} ${r.focus_prompt}`);
      }
      console.log("");
    }

    if (running.length > 0) {
      console.log("━━━ RUNNING ━━━");
      for (const r of running) {
        console.log(`  [${r.id}] ${r.protocol} — started ${relativeTime(r.requested_at)}`);
      }
      console.log("");
    }

    console.log("Commands:");
    console.log("  tsx scripts/check-pending-gandalf.ts                  # list (this)");
    console.log("  tsx scripts/check-pending-gandalf.ts mark-running <id>");
    console.log("  tsx scripts/check-pending-gandalf.ts mark-completed <id> <memo_path>");
    console.log("  tsx scripts/check-pending-gandalf.ts clear            # remove all completed");
    console.log("");
    return;
  }

  // ───────── mark-running ─────────
  if (action === "mark-running") {
    const id = process.argv[3];
    if (!id) {
      console.error("Usage: check-pending-gandalf.ts mark-running <id>");
      process.exit(1);
    }
    const run = data.runs.find((r) => r.id === id);
    if (!run) {
      console.error(`No run with id ${id}`);
      process.exit(1);
    }
    run.status = "running";
    writePending(data);
    console.log(`  ✓ Marked ${id} as running`);
    return;
  }

  // ───────── mark-completed ─────────
  if (action === "mark-completed") {
    const id = process.argv[3];
    const memoPath = process.argv[4];
    if (!id) {
      console.error("Usage: check-pending-gandalf.ts mark-completed <id> [memo_path]");
      process.exit(1);
    }
    const run = data.runs.find((r) => r.id === id);
    if (!run) {
      console.error(`No run with id ${id}`);
      process.exit(1);
    }
    run.status = "completed";
    if (memoPath) run.completed_memo_path = memoPath;
    writePending(data);
    console.log(`  ✓ Marked ${id} as completed${memoPath ? ` (memo: ${memoPath})` : ""}`);
    return;
  }

  // ───────── clear ─────────
  if (action === "clear") {
    const before = data.runs.length;
    data.runs = data.runs.filter((r) => r.status !== "completed");
    writePending(data);
    console.log(`  ✓ Cleared ${before - data.runs.length} completed runs`);
    return;
  }

  console.error(`Unknown action: ${action}`);
  console.error("Usage: check-pending-gandalf.ts [list | mark-running <id> | mark-completed <id> [path] | clear]");
  process.exit(1);
}

main();
