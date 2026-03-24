import type { ArchiveManager } from '../archive/manager.js';
import type { CacheManager } from '../utils/cache.js';
import type { GetAnalogousCasesInput, GetAnalogousCasesOutput, AnalogousCase, Decision } from '../types/index.js';

interface GetAnalogousCasesContext {
  cache: CacheManager;
  archiveManager: ArchiveManager;
}

export async function handleGetAnalogousCases(
  input: GetAnalogousCasesInput,
  ctx: GetAnalogousCasesContext
): Promise<GetAnalogousCasesOutput> {
  // Validate required input
  if (!input.protocol) {
    return {
      targetProtocol: '',
      analogousCases: []
    };
  }

  // Check cache
  const cacheKey = ctx.cache.generateKey('getAnalogousCases', {
    protocol: input.protocol,
    sector: input.sector,
    thesis: input.thesis,
    riskProfile: input.riskProfile,
    limit: input.limit
  });
  const cached = ctx.cache.get<GetAnalogousCasesOutput>(cacheKey);
  if (cached) return cached;

  // Get all decisions
  const decisions = await ctx.archiveManager.getDecisions({
    sector: input.sector,
    limit: 50 // Get more to filter for similarity
  });

  // Filter out the target protocol itself (with null safety)
  const targetProtocolLower = input.protocol.toLowerCase();
  const otherDecisions = decisions.filter(
    d => d.protocol && d.protocol.toLowerCase() !== targetProtocolLower
  );

  // Calculate similarity scores
  const casesWithScores = otherDecisions.map(d => {
    let score = 0;
    const reasons: string[] = [];

    // Sector match
    if (input.sector && d.sectors?.includes(input.sector)) {
      score += 3;
      reasons.push('Same sector');
    }

    // Conviction level similarity
    if (d.conviction >= 7) {
      score += 1;
      reasons.push('High conviction decision');
    }

    // Recent decision (more relevant)
    const decisionDate = new Date(d.date);
    const now = new Date();
    const monthsAgo = (now.getTime() - decisionDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo < 6) {
      score += 2;
      reasons.push('Recent decision');
    } else if (monthsAgo < 12) {
      score += 1;
      reasons.push('Within past year');
    }

    // Thesis keyword matching (if provided)
    if (input.thesis) {
      const thesisWords = input.thesis.toLowerCase().split(/\s+/);
      const sectors = d.sectors?.map(s => s.toLowerCase()) || [];
      const matchingWords = thesisWords.filter(w =>
        sectors.some(s => s.includes(w))
      );
      if (matchingWords.length > 0) {
        score += matchingWords.length;
        reasons.push('Thesis alignment');
      }
    }

    return {
      decision: d,
      score,
      reasons
    };
  });

  // Sort by score and take top N
  const topCases = casesWithScores
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit);

  // Transform to output format
  const analogousCases: AnalogousCase[] = topCases.map(c => ({
    protocol: c.decision.protocol,
    date: c.decision.date,
    similarityScore: Math.min(c.score / 10, 1), // Normalize to 0-1
    similarityReasons: c.reasons,
    decision: c.decision.decision as Decision,
    conviction: c.decision.conviction,
    outcome: {
      realized: false, // Would need postmortem data
      result: 'Pending',
      timeToResolution: undefined
    },
    applicableLessons: [] // Would need to extract from postmortems
  }));

  const result: GetAnalogousCasesOutput = {
    targetProtocol: input.protocol,
    analogousCases
  };

  // Cache result
  ctx.cache.set(cacheKey, result, 'analogousCases');

  return result;
}
