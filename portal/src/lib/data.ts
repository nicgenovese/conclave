import fs from "fs";
import path from "path";
import { Portfolio, RiskScore, MacroData, MemoMeta } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

export function getPortfolio(): Portfolio {
  const raw = fs.readFileSync(path.join(DATA_DIR, "portfolio.json"), "utf-8");
  return JSON.parse(raw);
}

export function getRiskScores(): RiskScore[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, "risk.json"), "utf-8");
  return JSON.parse(raw);
}

export function getMacroData(): MacroData {
  const raw = fs.readFileSync(path.join(DATA_DIR, "macro.json"), "utf-8");
  return JSON.parse(raw);
}

export function getMemos(): MemoMeta[] {
  const memosDir = path.join(DATA_DIR, "memos");
  if (!fs.existsSync(memosDir)) return [];

  const dirs = fs.readdirSync(memosDir).filter((d) => {
    const memoPath = path.join(memosDir, d, "memo.md");
    return fs.existsSync(memoPath);
  });

  return dirs.map((slug) => {
    const metaPath = path.join(memosDir, slug, "meta.json");
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      return { slug, ...meta };
    }

    // Fallback: extract from directory name
    const ticker = slug.replace(/^demo_/, "").toUpperCase();
    const memoContent = fs.readFileSync(
      path.join(memosDir, slug, "memo.md"),
      "utf-8"
    );
    const firstLine = memoContent.split("\n").find((l) => l.trim()) || "";

    return {
      slug,
      ticker,
      date: "2026-03-22",
      decision: "MONITOR" as const,
      conviction: 0,
      summary: firstLine.replace(/^#+\s*/, "").slice(0, 120),
    };
  });
}

export function getMemo(slug: string): { content: string; meta: MemoMeta } | null {
  const memoPath = path.join(DATA_DIR, "memos", slug, "memo.md");
  if (!fs.existsSync(memoPath)) return null;

  const content = fs.readFileSync(memoPath, "utf-8");
  const metas = getMemos();
  const meta = metas.find((m) => m.slug === slug) || {
    slug,
    ticker: slug.replace(/^demo_/, "").toUpperCase(),
    date: "2026-03-22",
    decision: "MONITOR" as const,
    conviction: 0,
    summary: "",
  };

  return { content, meta };
}
