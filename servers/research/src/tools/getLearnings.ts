import type { ArchiveManager } from '../archive/manager.js';
import type { CacheManager } from '../utils/cache.js';
import type { GetLearningsInput, GetLearningsOutput, LearningItem, LearningType, Confidence } from '../types/index.js';
import { parseMarkdownWithFrontmatter } from '../archive/parser.js';

interface GetLearningsContext {
  cache: CacheManager;
  archiveManager: ArchiveManager;
}

interface ParsedLearning {
  title: string;
  description: string;
  tags: string[];
  confidence: Confidence;
}

function parseLearningsFile(content: string, learningType: LearningType): ParsedLearning[] {
  const learnings: ParsedLearning[] = [];

  // Split by headers (## or ###)
  const sections = content.split(/(?=^#{2,3}\s)/m);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length === 0) continue;

    // Extract title from header
    const headerMatch = lines[0].match(/^#{2,3}\s+(.+)$/);
    if (!headerMatch) continue;

    const title = headerMatch[1];

    // Skip top-level section headers
    if (title.toLowerCase().includes('success') ||
        title.toLowerCase().includes('failure') ||
        title.toLowerCase().includes('warning') ||
        title.toLowerCase().includes('market') ||
        title.toLowerCase().includes('by category')) {
      continue;
    }

    // Extract description - first paragraph or list items
    const descriptionLines: string[] = [];
    const tags: string[] = [];
    let confidence: Confidence = 'medium';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for confidence
      if (line.toLowerCase().includes('confidence:')) {
        const confMatch = line.match(/confidence:\s*(low|medium|high)/i);
        if (confMatch) {
          confidence = confMatch[1].toLowerCase() as Confidence;
        }
        continue;
      }

      // Check for tags
      if (line.toLowerCase().includes('tags:')) {
        const tagMatch = line.match(/\[([^\]]+)\]/);
        if (tagMatch) {
          tags.push(...tagMatch[1].split(',').map(t => t.trim()));
        }
        continue;
      }

      // Collect description lines
      if (line.startsWith('-') || line.startsWith('*')) {
        // List item - check for **Description**: pattern first
        const descMatch = line.match(/^\s*[-*]\s*\*\*Description\*\*:\s*(.+)$/);
        if (descMatch) {
          descriptionLines.push(descMatch[1]);
          continue;
        }

        // Also capture **Supporting Evidence**: for context
        const evidenceMatch = line.match(/^\s*[-*]\s*\*\*Supporting Evidence\*\*:\s*(.+)$/);
        if (evidenceMatch) {
          descriptionLines.push(evidenceMatch[1]);
          continue;
        }

        // Fallback: extract text after bullet (excluding field labels)
        const text = line.replace(/^[-*]\s*(\[.\])?\s*/, '').trim();
        // Accept lines without **Field**: pattern that are long enough
        if (text && text.length > 10 && !text.match(/^\*\*\w+\*\*:/)) {
          descriptionLines.push(text);
        }
      } else if (line.length > 0 && !line.startsWith('#')) {
        descriptionLines.push(line);
      }
    }

    if (title && descriptionLines.length > 0) {
      learnings.push({
        title,
        description: descriptionLines.slice(0, 3).join(' '),
        tags,
        confidence
      });
    }
  }

  return learnings;
}

export async function handleGetLearnings(
  input: GetLearningsInput,
  ctx: GetLearningsContext
): Promise<GetLearningsOutput> {
  // Check cache
  const cacheKey = ctx.cache.generateKey('getLearnings', {
    learningType: input.learningType,
    sector: input.sector,
    limit: input.limit
  });
  const cached = ctx.cache.get<GetLearningsOutput>(cacheKey);
  if (cached) return cached;

  // Determine which file to read based on learning type
  let filePath: string;
  switch (input.learningType) {
    case 'patterns':
    case 'success-factors':
    case 'market-cycles':
      filePath = input.sector
        ? `learnings/${input.sector.toLowerCase()}-patterns.md`
        : 'learnings/defi-patterns.md';
      break;
    case 'red-flags':
      filePath = 'learnings/red-flags.md';
      break;
    default:
      filePath = 'learnings/defi-patterns.md';
  }

  // Read the file
  const doc = await ctx.archiveManager.readDocument(filePath);

  let items: LearningItem[] = [];

  if (doc) {
    const parsed = parseLearningsFile(doc.content, input.learningType);
    items = parsed.map((p, i) => ({
      id: `learning-${input.learningType}-${i}`,
      title: p.title,
      description: p.description,
      relatedProtocols: [],
      frequency: 1,
      confidence: p.confidence,
      tags: p.tags,
      createdDate: '',
      lastUpdated: new Date().toISOString()
    }));
  }

  // Apply limit
  items = items.slice(0, input.limit);

  const result: GetLearningsOutput = {
    learningType: input.learningType,
    items,
    lastUpdated: new Date().toISOString()
  };

  // Cache result
  ctx.cache.set(cacheKey, result, 'learnings');

  return result;
}
