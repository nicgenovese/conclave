import type { ArchiveManager } from '../archive/manager.js';
import type { CacheManager } from '../utils/cache.js';
import type { GetRedFlagsInput, GetRedFlagsOutput, RedFlag, RiskCategory, Severity } from '../types/index.js';

interface GetRedFlagsContext {
  cache: CacheManager;
  archiveManager: ArchiveManager;
}

interface ParsedRedFlag {
  title: string;
  description: string;
  severity: Severity;
  category: RiskCategory;
  detectionMethods: string[];
  mitigationStrategies: string[];
  tags: string[];
}

function parseRedFlagsFile(content: string): ParsedRedFlag[] {
  const redFlags: ParsedRedFlag[] = [];
  let currentCategory: RiskCategory = 'smart-contract';
  let currentFlag: Partial<ParsedRedFlag> | null = null;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Category headers (## level)
    if (line.match(/^##\s+Smart Contract/i)) {
      currentCategory = 'smart-contract';
      continue;
    }
    if (line.match(/^##\s+Economic/i)) {
      currentCategory = 'economic';
      continue;
    }
    if (line.match(/^##\s+Governance/i)) {
      currentCategory = 'governance';
      continue;
    }
    if (line.match(/^##\s+Operational/i)) {
      currentCategory = 'operational';
      continue;
    }
    if (line.match(/^##\s+Market/i)) {
      currentCategory = 'market';
      continue;
    }

    // Red flag title (### header)
    const flagMatch = line.match(/^###\s+(.+)$/);
    if (flagMatch) {
      // Save previous flag
      if (currentFlag && currentFlag.title) {
        redFlags.push(currentFlag as ParsedRedFlag);
      }

      currentFlag = {
        title: flagMatch[1],
        description: '',
        severity: 'medium',
        category: currentCategory,
        detectionMethods: [],
        mitigationStrategies: [],
        tags: []
      };
      continue;
    }

    // Flag properties (- **Field**: Value format)
    if (currentFlag && line.startsWith('-')) {
      const propLine = line.replace(/^-\s*/, '');

      // Parse **Severity**: value
      const severityMatch = propLine.match(/^\*\*Severity\*\*:\s*(low|medium|high|critical)/i);
      if (severityMatch) {
        currentFlag.severity = severityMatch[1].toLowerCase() as Severity;
        continue;
      }

      // Parse **Description**: value
      const descMatch = propLine.match(/^\*\*Description\*\*:\s*(.+)$/);
      if (descMatch) {
        currentFlag.description = descMatch[1];
        continue;
      }

      // Parse **Detection Methods**: value
      const detectMatch = propLine.match(/^\*\*Detection Methods?\*\*:\s*(.+)$/);
      if (detectMatch) {
        currentFlag.detectionMethods = [detectMatch[1]];
        continue;
      }

      // Parse **Mitigation**: value
      const mitigateMatch = propLine.match(/^\*\*Mitigation\*\*:\s*(.+)$/);
      if (mitigateMatch) {
        currentFlag.mitigationStrategies = [mitigateMatch[1]];
        continue;
      }

      // Parse **Tags**: [tag1, tag2]
      const tagsMatch = propLine.match(/^\*\*Tags\*\*:\s*\[([^\]]+)\]/);
      if (tagsMatch) {
        currentFlag.tags = tagsMatch[1].split(',').map(t => t.trim());
        continue;
      }
    }
  }

  // Save last flag
  if (currentFlag && currentFlag.title) {
    redFlags.push(currentFlag as ParsedRedFlag);
  }

  return redFlags;
}

export async function handleGetRedFlags(
  input: GetRedFlagsInput,
  ctx: GetRedFlagsContext
): Promise<GetRedFlagsOutput> {
  // Check cache
  const cacheKey = ctx.cache.generateKey('getRedFlags', {
    sector: input.sector,
    riskCategory: input.riskCategory,
    materialized: input.materialized,
    limit: input.limit
  });
  const cached = ctx.cache.get<GetRedFlagsOutput>(cacheKey);
  if (cached) return cached;

  // Read red flags file
  const doc = await ctx.archiveManager.readDocument('learnings/red-flags.md');

  let redFlags: RedFlag[] = [];

  if (doc) {
    const parsed = parseRedFlagsFile(doc.content);

    redFlags = parsed.map((p, i) => ({
      id: `redflag-${i}`,
      title: p.title,
      description: p.description,
      riskCategory: p.category,
      severityRating: p.severity,
      historicalInstances: [], // Would need structured data to populate
      detectionMethods: p.detectionMethods,
      mitigationStrategies: p.mitigationStrategies,
      firstDocumented: '',
      frequency: 1
    }));
  }

  // Apply filters
  if (input.riskCategory) {
    redFlags = redFlags.filter(rf => rf.riskCategory === input.riskCategory);
  }

  // Apply limit
  redFlags = redFlags.slice(0, input.limit);

  const result: GetRedFlagsOutput = {
    redFlags,
    totalCount: redFlags.length
  };

  // Cache result
  ctx.cache.set(cacheKey, result, 'redFlags');

  return result;
}
