import { parse as parseYaml } from 'yaml';

export interface ParsedDocument {
  frontmatter: Record<string, unknown>;
  content: string;
}

/**
 * Parse a markdown document with YAML frontmatter
 * Frontmatter is delimited by --- at the start of the file
 */
export function parseMarkdownWithFrontmatter(fileContent: string): ParsedDocument {
  const lines = fileContent.split('\n');

  // Check if file starts with frontmatter delimiter
  if (lines[0].trim() !== '---') {
    return {
      frontmatter: {},
      content: fileContent
    };
  }

  // Find the closing delimiter
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    // No closing delimiter found, treat as no frontmatter
    return {
      frontmatter: {},
      content: fileContent
    };
  }

  // Extract and parse frontmatter
  const frontmatterLines = lines.slice(1, closingIndex);
  const frontmatterYaml = frontmatterLines.join('\n');

  let frontmatter: Record<string, unknown> = {};
  try {
    frontmatter = parseYaml(frontmatterYaml) || {};
  } catch {
    console.error('Failed to parse YAML frontmatter');
    frontmatter = {};
  }

  // Extract content (everything after frontmatter)
  const contentLines = lines.slice(closingIndex + 1);
  const content = contentLines.join('\n').trim();

  return {
    frontmatter,
    content
  };
}

/**
 * Generate YAML frontmatter string from object
 */
export function generateFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = ['---'];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (typeof value[0] === 'object') {
        // Complex array - use YAML block format
        lines.push(`${key}:`);
        for (const item of value) {
          const entries = Object.entries(item as Record<string, unknown>);
          lines.push(`  - ${entries[0][0]}: ${JSON.stringify(entries[0][1])}`);
          for (let i = 1; i < entries.length; i++) {
            lines.push(`    ${entries[i][0]}: ${JSON.stringify(entries[i][1])}`);
          }
        }
      } else {
        // Simple array
        lines.push(`${key}: [${value.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(', ')}]`);
      }
    } else if (typeof value === 'object') {
      // Nested object - skip for simplicity in frontmatter
      continue;
    } else if (typeof value === 'string') {
      // Check if string needs quoting
      if (value.includes(':') || value.includes('#') || value.startsWith('"')) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Extract excerpt from markdown content
 */
export function extractExcerpt(content: string, maxLength: number = 200): string {
  // Remove markdown headers
  let text = content.replace(/^#+\s+.+$/gm, '');
  // Remove markdown formatting
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove tables
  text = text.replace(/\|[^\n]+\|/g, '');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  if (text.length <= maxLength) {
    return text;
  }

  // Truncate at word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

/**
 * Extract keywords from markdown content for search indexing
 */
export function extractKeywords(content: string): string[] {
  // Extract headers
  const headers = content.match(/^#+\s+(.+)$/gm) || [];
  const headerWords = headers
    .map(h => h.replace(/^#+\s+/, '').toLowerCase())
    .flatMap(h => h.split(/\s+/));

  // Extract bold text as keywords
  const boldMatches = content.match(/\*\*([^*]+)\*\*/g) || [];
  const boldWords = boldMatches
    .map(m => m.replace(/\*\*/g, '').toLowerCase())
    .flatMap(m => m.split(/\s+/));

  // Combine and dedupe
  const keywords = [...new Set([...headerWords, ...boldWords])];

  // Filter short words and common words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  return keywords.filter(w => w.length > 2 && !stopWords.has(w));
}
