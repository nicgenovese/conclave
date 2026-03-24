import fs from "fs";
import path from "path";
import { Portfolio, RiskScore, MacroData, MemoMeta } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

// ============================================
// Safe JSON reader — never crashes, always logs
// ============================================
function safeReadJSON<T>(filePath: string, fallback: T): { data: T; error: string | null } {
  try {
    if (!fs.existsSync(filePath)) {
      return { data: fallback, error: `File not found: ${filePath}` };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as T;
    return { data: parsed, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[data] Failed to read ${filePath}: ${msg}`);
    return { data: fallback, error: msg };
  }
}

function safeReadFile(filePath: string): { content: string; error: string | null } {
  try {
    if (!fs.existsSync(filePath)) {
      return { content: "", error: `File not found: ${filePath}` };
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return { content, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[data] Failed to read ${filePath}: ${msg}`);
    return { content: "", error: msg };
  }
}

// ============================================
// Default fallbacks — app renders even with no data
// ============================================
const EMPTY_PORTFOLIO: Portfolio = {
  nav: 0,
  updated_at: "N/A",
  wallet: "",
  positions: [],
  perps: [],
  total_perp_exposure: 0,
  avg_leverage: 0,
  max_perp_loss: 0,
  allocation_buckets: [],
};

const EMPTY_MACRO: MacroData = {
  updated_at: "N/A",
  polymarket: [],
  signals: [],
};

// ============================================
// Data access functions — always return valid data
// ============================================
export function getPortfolio(): Portfolio {
  const { data } = safeReadJSON<Portfolio>(
    path.join(DATA_DIR, "portfolio.json"),
    EMPTY_PORTFOLIO
  );
  return data;
}

export function getRiskScores(): RiskScore[] {
  const { data } = safeReadJSON<RiskScore[]>(
    path.join(DATA_DIR, "risk.json"),
    []
  );
  return data;
}

export function getMacroData(): MacroData {
  const { data } = safeReadJSON<MacroData>(
    path.join(DATA_DIR, "macro.json"),
    EMPTY_MACRO
  );
  return data;
}

export function getMemos(): MemoMeta[] {
  const memosDir = path.join(DATA_DIR, "memos");
  try {
    if (!fs.existsSync(memosDir)) return [];

    const dirs = fs.readdirSync(memosDir).filter((d) => {
      try {
        return fs.existsSync(path.join(memosDir, d, "memo.md"));
      } catch {
        return false;
      }
    });

    return dirs
      .map((slug) => {
        try {
          const metaPath = path.join(memosDir, slug, "meta.json");
          if (fs.existsSync(metaPath)) {
            const { data } = safeReadJSON<Record<string, unknown>>(metaPath, {});
            return { slug, ...data } as MemoMeta;
          }

          // Fallback: extract from directory name
          const ticker = slug.replace(/^demo_/, "").toUpperCase();
          const { content } = safeReadFile(path.join(memosDir, slug, "memo.md"));
          const firstLine = content.split("\n").find((l) => l.trim()) || "";

          return {
            slug,
            ticker,
            date: "Unknown",
            decision: "MONITOR" as const,
            conviction: 0,
            summary: firstLine.replace(/^#+\s*/, "").slice(0, 120),
          };
        } catch (err) {
          console.error(`[data] Error reading memo ${slug}:`, err);
          return null;
        }
      })
      .filter((m): m is MemoMeta => m !== null);
  } catch (err) {
    console.error("[data] Error reading memos directory:", err);
    return [];
  }
}

export function getMemo(
  slug: string
): { content: string; meta: MemoMeta } | null {
  const memoPath = path.join(DATA_DIR, "memos", slug, "memo.md");
  const { content, error } = safeReadFile(memoPath);
  if (error || !content) return null;

  const metas = getMemos();
  const meta = metas.find((m) => m.slug === slug) || {
    slug,
    ticker: slug.replace(/^demo_/, "").toUpperCase(),
    date: "Unknown",
    decision: "MONITOR" as const,
    conviction: 0,
    summary: "",
  };

  return { content, meta };
}

// ============================================
// Briefs — daily market briefs
// ============================================
export function getBriefs(): { date: string; preview: string }[] {
  const briefsDir = path.join(DATA_DIR, "briefs");
  try {
    if (!fs.existsSync(briefsDir)) return [];

    const files = fs.readdirSync(briefsDir).filter((f) => f.endsWith(".md"));

    return files
      .map((file) => {
        const date = file.replace(/\.md$/, "");
        const { content } = safeReadFile(path.join(briefsDir, file));
        // Strip leading markdown headings for the preview
        const lines = content.split("\n").filter((l) => l.trim());
        const preview = lines
          .map((l) => l.replace(/^#+\s*/, ""))
          .join(" ")
          .slice(0, 200);
        return { date, preview };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    console.error("[data] Error reading briefs directory:", err);
    return [];
  }
}

export function getBrief(date: string): string | null {
  // Sanitize to prevent path traversal
  const safe = date.replace(/[^a-zA-Z0-9_-]/g, "");
  const briefPath = path.join(DATA_DIR, "briefs", `${safe}.md`);
  const { content, error } = safeReadFile(briefPath);
  if (error || !content) return null;
  return content;
}

// ============================================
// Health check — reports data layer status
// ============================================
export interface DataHealth {
  portfolio: { ok: boolean; error: string | null; updatedAt: string };
  risk: { ok: boolean; error: string | null; count: number };
  macro: { ok: boolean; error: string | null; updatedAt: string; eventCount: number };
  memos: { ok: boolean; error: string | null; count: number };
  briefs: { ok: boolean; error: string | null; latest: string | null };
}

export function getDataHealth(): DataHealth {
  const portfolioResult = safeReadJSON<Portfolio>(
    path.join(DATA_DIR, "portfolio.json"),
    EMPTY_PORTFOLIO
  );
  const riskResult = safeReadJSON<RiskScore[]>(
    path.join(DATA_DIR, "risk.json"),
    []
  );
  const macroResult = safeReadJSON<MacroData>(
    path.join(DATA_DIR, "macro.json"),
    EMPTY_MACRO
  );

  let memoCount = 0;
  let memoError: string | null = null;
  try {
    memoCount = getMemos().length;
  } catch (err) {
    memoError = err instanceof Error ? err.message : String(err);
  }

  let latestBrief: string | null = null;
  let briefError: string | null = null;
  try {
    const briefsDir = path.join(DATA_DIR, "briefs");
    if (fs.existsSync(briefsDir)) {
      const files = fs.readdirSync(briefsDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse();
      latestBrief = files[0] || null;
    }
  } catch (err) {
    briefError = err instanceof Error ? err.message : String(err);
  }

  return {
    portfolio: {
      ok: !portfolioResult.error,
      error: portfolioResult.error,
      updatedAt: portfolioResult.data.updated_at,
    },
    risk: {
      ok: !riskResult.error,
      error: riskResult.error,
      count: riskResult.data.length,
    },
    macro: {
      ok: !macroResult.error,
      error: macroResult.error,
      updatedAt: macroResult.data.updated_at,
      eventCount: macroResult.data.polymarket.length,
    },
    memos: {
      ok: !memoError,
      error: memoError,
      count: memoCount,
    },
    briefs: {
      ok: !briefError,
      error: briefError,
      latest: latestBrief,
    },
  };
}
