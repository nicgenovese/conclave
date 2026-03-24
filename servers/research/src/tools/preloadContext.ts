import type { ArchiveManager } from '../archive/manager.js';
import type { CacheManager } from '../utils/cache.js';
import type {
  PreloadContextInput,
  PreloadContextOutput,
  DecisionFrontmatter,
  Confidence,
  Severity,
  RiskCategory,
  Decision
} from '../types/index.js';

interface PreloadContextContext {
  cache: CacheManager;
  archiveManager: ArchiveManager;
}

interface ParsedLearning {
  title: string;
  description: string;
  confidence: Confidence;
  type: 'success' | 'warning';
}

interface ParsedRedFlag {
  title: string;
  description: string;
  severity: Severity;
  category: RiskCategory;
  detectionMethod: string;
  mitigation: string;
}

/**
 * Parse DeFi patterns markdown into structured learnings
 */
function parseLearningsFromPatterns(content: string): ParsedLearning[] {
  const learnings: ParsedLearning[] = [];
  let currentType: 'success' | 'warning' = 'success';

  const sections = content.split(/(?=^#{2,3}\s)/m);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length === 0) continue;

    // Detect section type
    if (lines[0].toLowerCase().includes('success') || lines[0].toLowerCase().includes('factors')) {
      currentType = 'success';
      continue;
    }
    if (lines[0].toLowerCase().includes('warning') || lines[0].toLowerCase().includes('indicator')) {
      currentType = 'warning';
      continue;
    }

    // Parse individual learning
    const headerMatch = lines[0].match(/^###\s+(.+)$/);
    if (!headerMatch) continue;

    const title = headerMatch[1];
    let description = '';
    let confidence: Confidence = 'medium';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for confidence
      const confMatch = line.match(/confidence:\s*(low|medium|high)/i);
      if (confMatch) {
        confidence = confMatch[1].toLowerCase() as Confidence;
        continue;
      }

      // Extract description
      const descMatch = line.match(/^\*\*Description\*\*:\s*(.+)$/);
      if (descMatch) {
        description = descMatch[1];
        break;
      }

      // Fallback: first substantive line
      if (line.startsWith('-') && !description) {
        const text = line.replace(/^-\s*\*\*\w+\*\*:\s*/, '').trim();
        if (text.length > 20 && !text.startsWith('**')) {
          description = text;
        }
      }
    }

    if (title && description) {
      learnings.push({ title, description, confidence, type: currentType });
    }
  }

  return learnings;
}

/**
 * Parse red flags markdown into structured red flags
 */
function parseRedFlagsFile(content: string): ParsedRedFlag[] {
  const redFlags: ParsedRedFlag[] = [];
  let currentCategory: RiskCategory = 'smart-contract';
  let currentFlag: Partial<ParsedRedFlag> | null = null;

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Category headers
    if (trimmed.match(/^##\s+Smart Contract/i)) { currentCategory = 'smart-contract'; continue; }
    if (trimmed.match(/^##\s+Economic/i)) { currentCategory = 'economic'; continue; }
    if (trimmed.match(/^##\s+Governance/i)) { currentCategory = 'governance'; continue; }
    if (trimmed.match(/^##\s+Operational/i)) { currentCategory = 'operational'; continue; }
    if (trimmed.match(/^##\s+Market/i)) { currentCategory = 'market'; continue; }

    // Red flag title
    const flagMatch = trimmed.match(/^###\s+(.+)$/);
    if (flagMatch) {
      if (currentFlag?.title) {
        redFlags.push(currentFlag as ParsedRedFlag);
      }
      currentFlag = {
        title: flagMatch[1],
        description: '',
        severity: 'medium',
        category: currentCategory,
        detectionMethod: '',
        mitigation: ''
      };
      continue;
    }

    // Flag properties
    if (currentFlag && trimmed.startsWith('-')) {
      const propLine = trimmed.replace(/^-\s*/, '');

      const severityMatch = propLine.match(/^\*\*Severity\*\*:\s*(low|medium|high|critical)/i);
      if (severityMatch) {
        currentFlag.severity = severityMatch[1].toLowerCase() as Severity;
        continue;
      }

      const descMatch = propLine.match(/^\*\*Description\*\*:\s*(.+)$/);
      if (descMatch) {
        currentFlag.description = descMatch[1];
        continue;
      }

      const detectMatch = propLine.match(/^\*\*Detection Methods?\*\*:\s*(.+)$/);
      if (detectMatch) {
        currentFlag.detectionMethod = detectMatch[1];
        continue;
      }

      const mitigateMatch = propLine.match(/^\*\*Mitigation\*\*:\s*(.+)$/);
      if (mitigateMatch) {
        currentFlag.mitigation = mitigateMatch[1];
        continue;
      }
    }
  }

  // Save last flag
  if (currentFlag?.title) {
    redFlags.push(currentFlag as ParsedRedFlag);
  }

  return redFlags;
}

/**
 * Generate a context summary from the preloaded data
 */
function generateContextSummary(
  protocol: string,
  priorDecisions: PreloadContextOutput['priorDecisions'],
  analogousCases: PreloadContextOutput['analogousCases'],
  sectorLearnings: PreloadContextOutput['sectorLearnings'],
  redFlags: PreloadContextOutput['redFlagsToWatch']
): string {
  const parts: string[] = [];

  if (priorDecisions.found) {
    const lastDecision = priorDecisions.decisions[0];
    parts.push(`${protocol} was previously evaluated (${lastDecision.date}): ${lastDecision.decision.toUpperCase()} with ${lastDecision.conviction}/10 conviction.`);
  } else {
    parts.push(`${protocol} has not been previously evaluated by Conclave.`);
  }

  if (analogousCases.found) {
    parts.push(`${analogousCases.count} analogous case(s) found for reference.`);
  }

  const highRiskFlags = redFlags.filter(rf => rf.severity === 'critical' || rf.severity === 'high');
  if (highRiskFlags.length > 0) {
    parts.push(`${highRiskFlags.length} high-priority red flags to investigate.`);
  }

  parts.push(`${sectorLearnings.successPatterns.length} success patterns and ${sectorLearnings.warningIndicators.length} warning indicators loaded.`);

  return parts.join(' ');
}

/**
 * Extract rationale from decision document content
 */
function extractRationale(content: string): string {
  const execMatch = content.match(/## Executive Decision\s*\n([\s\S]*?)(?=\n---|\n## )/);
  if (execMatch) return execMatch[1].trim().slice(0, 500);

  const rationaleMatch = content.match(/## Decision Rationale\s*\n([\s\S]*?)(?=\n---|\n## )/);
  if (rationaleMatch) return rationaleMatch[1].trim().slice(0, 500);

  const firstParaMatch = content.match(/^#[^\n]+\n+([^\n#]+)/m);
  if (firstParaMatch) return firstParaMatch[1].trim().slice(0, 300);

  return '';
}

export async function handlePreloadContext(
  input: PreloadContextInput,
  ctx: PreloadContextContext
): Promise<PreloadContextOutput> {
  // Check cache
  const cacheKey = ctx.cache.generateKey('preloadContext', {
    protocol: input.protocol,
    sector: input.sector,
    includeAnalogous: input.includeAnalogous,
    includeRedFlags: input.includeRedFlags,
    includeLearnings: input.includeLearnings
  });
  const cached = ctx.cache.get<PreloadContextOutput>(cacheKey);
  if (cached) return cached;

  const targetProtocolLower = input.protocol.toLowerCase();
  const sector = input.sector || 'DeFi';

  // 1. Get prior decisions for this protocol
  const decisionFiles = await ctx.archiveManager.listFiles('decisions');
  const priorDecisions: PreloadContextOutput['priorDecisions'] = {
    found: false,
    count: 0,
    decisions: []
  };

  for (const filePath of decisionFiles) {
    const doc = await ctx.archiveManager.readDocument(filePath);
    if (!doc) continue;

    const fm = doc.frontmatter as unknown as DecisionFrontmatter;
    if (fm.protocol?.toLowerCase() === targetProtocolLower) {
      priorDecisions.decisions.push({
        date: fm.date,
        decision: fm.decision,
        conviction: fm.conviction,
        rationale: extractRationale(doc.content)
      });
    }
  }

  priorDecisions.found = priorDecisions.decisions.length > 0;
  priorDecisions.count = priorDecisions.decisions.length;
  priorDecisions.decisions.sort((a, b) => b.date.localeCompare(a.date));

  // 2. Get analogous cases (other protocols in same sector)
  const analogousCases: PreloadContextOutput['analogousCases'] = {
    found: false,
    count: 0,
    cases: []
  };

  if (input.includeAnalogous) {
    for (const filePath of decisionFiles) {
      const doc = await ctx.archiveManager.readDocument(filePath);
      if (!doc) continue;

      const fm = doc.frontmatter as unknown as DecisionFrontmatter;

      // Skip the target protocol
      if (fm.protocol?.toLowerCase() === targetProtocolLower) continue;

      // Check sector match
      const sectorMatch = fm.sectors?.some(s =>
        s.toLowerCase().includes(sector.toLowerCase()) ||
        sector.toLowerCase().includes(s.toLowerCase())
      );

      if (sectorMatch || !input.sector) {
        analogousCases.cases.push({
          protocol: fm.protocol,
          sector: fm.sectors?.[0] || 'Unknown',
          decision: fm.decision,
          conviction: fm.conviction,
          similarityReason: sectorMatch ? `Same sector: ${sector}` : 'DeFi protocol',
          keyLearning: extractRationale(doc.content).slice(0, 200)
        });
      }
    }

    // Sort by conviction and limit
    analogousCases.cases.sort((a, b) => b.conviction - a.conviction);
    analogousCases.cases = analogousCases.cases.slice(0, input.analogousLimit);
    analogousCases.found = analogousCases.cases.length > 0;
    analogousCases.count = analogousCases.cases.length;
  }

  // 3. Get sector learnings
  const sectorLearnings: PreloadContextOutput['sectorLearnings'] = {
    successPatterns: [],
    warningIndicators: []
  };

  if (input.includeLearnings) {
    const patternsFile = `learnings/${sector.toLowerCase()}-patterns.md`;
    let doc = await ctx.archiveManager.readDocument(patternsFile);

    // Fall back to defi-patterns if sector-specific doesn't exist
    if (!doc) {
      doc = await ctx.archiveManager.readDocument('learnings/defi-patterns.md');
    }

    if (doc) {
      const learnings = parseLearningsFromPatterns(doc.content);
      sectorLearnings.successPatterns = learnings
        .filter(l => l.type === 'success')
        .map(l => ({ title: l.title, description: l.description, confidence: l.confidence }));
      sectorLearnings.warningIndicators = learnings
        .filter(l => l.type === 'warning')
        .map(l => ({ title: l.title, description: l.description, confidence: l.confidence }));
    }
  }

  // 4. Get red flags
  const redFlagsToWatch: PreloadContextOutput['redFlagsToWatch'] = [];

  if (input.includeRedFlags) {
    const doc = await ctx.archiveManager.readDocument('learnings/red-flags.md');
    if (doc) {
      const parsed = parseRedFlagsFile(doc.content);
      for (const rf of parsed) {
        redFlagsToWatch.push({
          title: rf.title,
          description: rf.description,
          severity: rf.severity,
          category: rf.category,
          detectionMethod: rf.detectionMethod,
          mitigation: rf.mitigation
        });
      }
    }
  }

  // 5. Generate summary
  const contextSummary = generateContextSummary(
    input.protocol,
    priorDecisions,
    analogousCases,
    sectorLearnings,
    redFlagsToWatch
  );

  const result: PreloadContextOutput = {
    protocol: input.protocol,
    sector: input.sector || null,
    generatedAt: new Date().toISOString(),
    priorDecisions,
    analogousCases,
    sectorLearnings,
    redFlagsToWatch,
    contextSummary
  };

  // Cache result (5 minute TTL for context)
  ctx.cache.set(cacheKey, result, 'preloadContext');

  return result;
}
