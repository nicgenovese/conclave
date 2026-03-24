import type { ArchiveManager } from '../archive/manager.js';
import type { CacheManager } from '../utils/cache.js';
import type { GetDecisionsInput, GetDecisionsOutput, DecisionRecord, DecisionFrontmatter } from '../types/index.js';

interface GetDecisionsContext {
  cache: CacheManager;
  archiveManager: ArchiveManager;
}

/**
 * Extract rationale from decision document content.
 * Looks for "Executive Decision" or "Decision Rationale" sections.
 */
function extractRationale(content: string): string {
  // Try to find Executive Decision section first
  const execMatch = content.match(/## Executive Decision\s*\n([\s\S]*?)(?=\n---|\n## )/);
  if (execMatch) {
    return execMatch[1].trim().slice(0, 500);
  }

  // Fall back to Decision Rationale section
  const rationaleMatch = content.match(/## Decision Rationale\s*\n([\s\S]*?)(?=\n---|\n## )/);
  if (rationaleMatch) {
    return rationaleMatch[1].trim().slice(0, 500);
  }

  // Fall back to first paragraph after first heading
  const firstParaMatch = content.match(/^#[^\n]+\n+([^\n#]+)/m);
  if (firstParaMatch) {
    return firstParaMatch[1].trim().slice(0, 300);
  }

  return '';
}

export async function handleGetDecisions(
  input: GetDecisionsInput,
  ctx: GetDecisionsContext
): Promise<GetDecisionsOutput> {
  // Check cache
  const cacheKey = ctx.cache.generateKey('getDecisions', {
    protocol: input.protocol,
    sector: input.sector,
    outcome: input.outcome,
    dateRange: input.dateRange ? `${input.dateRange.start}-${input.dateRange.end}` : '',
    limit: input.limit
  });
  const cached = ctx.cache.get<GetDecisionsOutput>(cacheKey);
  if (cached) return cached;

  // Get decision files from archive to access both frontmatter and content
  const decisionFiles = await ctx.archiveManager.listFiles('decisions');
  const decisionRecords: DecisionRecord[] = [];

  for (const filePath of decisionFiles) {
    const doc = await ctx.archiveManager.readDocument(filePath);
    if (!doc) continue;

    const fm = doc.frontmatter as unknown as DecisionFrontmatter;

    // Apply filters
    if (input.protocol && fm.protocol?.toLowerCase() !== input.protocol.toLowerCase()) {
      continue;
    }
    if (input.sector && !fm.sectors?.some(s => s.toLowerCase() === input.sector!.toLowerCase())) {
      continue;
    }
    if (input.outcome && fm.decision !== input.outcome) {
      continue;
    }
    if (input.dateRange) {
      if (fm.date < input.dateRange.start || fm.date > input.dateRange.end) {
        continue;
      }
    }

    // Extract rationale from content
    const rationale = extractRationale(doc.content);

    decisionRecords.push({
      id: `decision-${fm.protocol}-${fm.date}`,
      protocol: fm.protocol,
      date: fm.date,
      decision: fm.decision,
      conviction: fm.conviction,
      rationale,
      sectors: fm.sectors || [],
      riskRating: fm.riskRating,
      followUpDate: fm.nextReviewDate
    });
  }

  // Sort by date descending
  decisionRecords.sort((a, b) => b.date.localeCompare(a.date));

  // Apply limit
  const limitedRecords = decisionRecords.slice(0, input.limit || 10);

  const result: GetDecisionsOutput = {
    decisions: limitedRecords,
    totalCount: decisionRecords.length,
    searchPerformed: new Date().toISOString()
  };

  // Cache result
  ctx.cache.set(cacheKey, result, 'decisions');

  return result;
}
