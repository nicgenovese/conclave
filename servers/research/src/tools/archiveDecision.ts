import type { ArchiveManager } from '../archive/manager.js';
import type { ArchiveDecisionInput, ArchiveDecisionOutput, DecisionFrontmatter } from '../types/index.js';

interface ArchiveDecisionContext {
  archiveManager: ArchiveManager;
}

export async function handleArchiveDecision(
  input: ArchiveDecisionInput,
  ctx: ArchiveDecisionContext
): Promise<ArchiveDecisionOutput> {
  // Generate file path
  const filename = `${input.protocol.toLowerCase()}-${input.date}-${input.decision}.md`;
  const storagePath = `decisions/${filename}`;

  // Build frontmatter
  const frontmatter: DecisionFrontmatter = {
    protocol: input.protocol,
    date: input.date,
    decision: input.decision,
    conviction: input.conviction,
    sectors: [input.sector],
    riskRating: input.riskAssessment
      ? (input.riskAssessment.overallRating <= 2 ? 'low'
        : input.riskAssessment.overallRating <= 3 ? 'medium'
        : input.riskAssessment.overallRating <= 4 ? 'high'
        : 'critical')
      : undefined,
    nextReviewDate: input.nextReviewDate,
    conditions: input.conditions
  };

  // Build content
  const contentLines: string[] = [
    `# Decision Record: ${input.protocol}`,
    '',
    `**Date**: ${input.date}`,
    `**Decision**: ${input.decision.toUpperCase()}`,
    `**Conviction**: ${input.conviction}/10`,
    '',
    '## Decision Rationale',
    '',
    input.rationale,
    ''
  ];

  // Add risk assessment if provided
  if (input.riskAssessment) {
    contentLines.push('## Risk Summary');
    contentLines.push('');
    contentLines.push('| Category | Rating |');
    contentLines.push('|----------|--------|');
    for (const [category, rating] of Object.entries(input.riskAssessment.categories)) {
      contentLines.push(`| ${category} | ${rating}/5 |`);
    }
    contentLines.push(`| **Overall** | ${input.riskAssessment.overallRating}/5 |`);
    contentLines.push('');
  }

  // Add conditions if provided
  if (input.conditions && input.conditions.length > 0) {
    contentLines.push('## Conditions');
    contentLines.push('');
    for (const cond of input.conditions) {
      contentLines.push(`- [ ] **${cond.condition}**: ${cond.trigger}`);
    }
    contentLines.push('');
  }

  // Add related memo link if provided
  if (input.memoPath) {
    contentLines.push('## Related Documents');
    contentLines.push('');
    contentLines.push(`- Investment Memo: [${input.memoPath}](../${input.memoPath})`);
    contentLines.push('');
  }

  contentLines.push('---');
  contentLines.push('');
  contentLines.push('*Recorded by Conclave Investment Committee*');

  const content = contentLines.join('\n');

  // Write to archive
  try {
    await ctx.archiveManager.writeDocument(storagePath, frontmatter as unknown as Record<string, unknown>, content);

    return {
      success: true,
      decisionId: `decision-${input.protocol}-${input.date}`,
      storagePath,
      timestamp: new Date().toISOString(),
      message: `Decision record archived successfully at ${storagePath}`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      decisionId: '',
      storagePath: '',
      timestamp: new Date().toISOString(),
      message: `Failed to archive decision: ${message}`
    };
  }
}
