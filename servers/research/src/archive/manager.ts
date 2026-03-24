import * as fs from 'fs/promises';
import * as path from 'path';
import { parseMarkdownWithFrontmatter, generateFrontmatter, extractExcerpt, extractKeywords } from './parser.js';
import type { ArchiveDocument, MemoFrontmatter, DecisionFrontmatter, SearchIndex, SearchIndexEntry } from '../types/index.js';

export class ArchiveManager {
  private archivePath: string;
  private indexCache: SearchIndex | null = null;
  private indexCacheTime: number = 0;
  private readonly INDEX_CACHE_TTL = 60000; // 1 minute

  constructor(archivePath?: string) {
    this.archivePath = archivePath || process.env.ARCHIVE_PATH || path.join(process.cwd(), '../../archive');
    console.error(`ArchiveManager: Using archive path: ${this.archivePath}`);
  }

  /**
   * Ensure the archive path is resolved to absolute
   */
  private resolvePath(relativePath: string): string {
    return path.resolve(this.archivePath, relativePath);
  }

  /**
   * Check if archive directory exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.archivePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read and parse a markdown document from the archive
   */
  async readDocument(relativePath: string): Promise<ArchiveDocument | null> {
    try {
      const fullPath = this.resolvePath(relativePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const parsed = parseMarkdownWithFrontmatter(content);

      // Determine document type from path
      let type: ArchiveDocument['type'] = 'memo';
      if (relativePath.includes('decisions/')) type = 'decision';
      else if (relativePath.includes('postmortems/')) type = 'postmortem';
      else if (relativePath.includes('learnings/')) type = 'learning';

      return {
        path: relativePath,
        frontmatter: parsed.frontmatter,
        content: parsed.content,
        type
      };
    } catch {
      return null;
    }
  }

  /**
   * List all markdown files in a directory
   */
  async listFiles(directory: string): Promise<string[]> {
    try {
      const fullPath = this.resolvePath(directory);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter(e => e.isFile() && e.name.endsWith('.md'))
        .map(e => path.join(directory, e.name));
    } catch {
      return [];
    }
  }

  /**
   * Write a document to the archive
   */
  async writeDocument(relativePath: string, frontmatter: Record<string, unknown>, content: string): Promise<void> {
    const fullPath = this.resolvePath(relativePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Generate file content
    const frontmatterStr = generateFrontmatter(frontmatter);
    const fileContent = `${frontmatterStr}\n\n${content}`;

    await fs.writeFile(fullPath, fileContent, 'utf-8');

    // Invalidate index cache
    this.indexCache = null;
  }

  /**
   * Get or build the search index
   */
  async getSearchIndex(): Promise<SearchIndex> {
    const now = Date.now();

    // Return cached index if still valid
    if (this.indexCache && (now - this.indexCacheTime) < this.INDEX_CACHE_TTL) {
      return this.indexCache;
    }

    // Try to read stored index
    const indexPath = this.resolvePath('metadata/search-index.json');
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      this.indexCache = JSON.parse(indexContent) as SearchIndex;
      this.indexCacheTime = now;
      return this.indexCache;
    } catch {
      // Build index from scratch
      return this.rebuildIndex();
    }
  }

  /**
   * Rebuild the search index by scanning all documents
   */
  async rebuildIndex(): Promise<SearchIndex> {
    const documents: SearchIndexEntry[] = [];

    // Scan memos
    const memos = await this.listFiles('memos');
    for (const memoPath of memos) {
      const doc = await this.readDocument(memoPath);
      if (doc) {
        const fm = doc.frontmatter as unknown as MemoFrontmatter;
        documents.push({
          id: `memo-${path.basename(memoPath, '.md')}`,
          type: 'memo',
          protocol: fm.protocol,
          date: fm.date,
          path: memoPath,
          title: fm.title || path.basename(memoPath, '.md'),
          tags: fm.tags || [],
          keywords: extractKeywords(doc.content)
        });
      }
    }

    // Scan decisions
    const decisions = await this.listFiles('decisions');
    for (const decisionPath of decisions) {
      const doc = await this.readDocument(decisionPath);
      if (doc) {
        const fm = doc.frontmatter as unknown as DecisionFrontmatter;
        documents.push({
          id: `decision-${path.basename(decisionPath, '.md')}`,
          type: 'decision',
          protocol: fm.protocol,
          date: fm.date,
          path: decisionPath,
          title: `${fm.protocol} - ${fm.decision}`,
          tags: fm.sectors || [],
          keywords: extractKeywords(doc.content)
        });
      }
    }

    // Scan learnings
    const learnings = await this.listFiles('learnings');
    for (const learningPath of learnings) {
      const doc = await this.readDocument(learningPath);
      if (doc) {
        documents.push({
          id: `learning-${path.basename(learningPath, '.md')}`,
          type: 'learning',
          path: learningPath,
          title: path.basename(learningPath, '.md').replace(/-/g, ' '),
          tags: [],
          keywords: extractKeywords(doc.content)
        });
      }
    }

    const index: SearchIndex = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      documentCount: documents.length,
      documents
    };

    // Save index
    try {
      const indexPath = this.resolvePath('metadata/search-index.json');
      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save search index:', err);
    }

    this.indexCache = index;
    this.indexCacheTime = Date.now();

    return index;
  }

  /**
   * Search documents by protocol and keywords
   */
  async searchDocuments(
    protocol: string,
    options: {
      keywords?: string[];
      type?: ArchiveDocument['type'];
      dateRange?: { start: string; end: string };
      limit?: number;
    } = {}
  ): Promise<Array<SearchIndexEntry & { matchScore: number }>> {
    const index = await this.getSearchIndex();
    const limit = options.limit || 10;

    // Filter and score documents
    const results = index.documents
      .filter(doc => {
        // Type filter
        if (options.type && doc.type !== options.type) return false;

        // Date filter
        if (options.dateRange && doc.date) {
          if (doc.date < options.dateRange.start || doc.date > options.dateRange.end) {
            return false;
          }
        }

        return true;
      })
      .map(doc => {
        let score = 0;

        // Protocol match (highest weight)
        if (doc.protocol?.toLowerCase() === protocol.toLowerCase()) {
          score += 10;
        } else if (doc.protocol?.toLowerCase().includes(protocol.toLowerCase())) {
          score += 5;
        }

        // Title match
        if (doc.title.toLowerCase().includes(protocol.toLowerCase())) {
          score += 3;
        }

        // Keyword matches
        const docKeywords = doc.keywords || [];
        for (const keyword of options.keywords || []) {
          if (docKeywords.some(k => k.includes(keyword.toLowerCase()))) {
            score += 1;
          }
        }

        // Tag matches
        for (const keyword of options.keywords || []) {
          if (doc.tags.some(t => t.toLowerCase().includes(keyword.toLowerCase()))) {
            score += 1;
          }
        }

        return { ...doc, matchScore: score };
      })
      .filter(doc => doc.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return results;
  }

  /**
   * Get all decisions matching filters
   */
  async getDecisions(filters: {
    protocol?: string;
    sector?: string;
    outcome?: string;
    dateRange?: { start: string; end: string };
    limit?: number;
  } = {}): Promise<DecisionFrontmatter[]> {
    const decisionFiles = await this.listFiles('decisions');
    const decisions: DecisionFrontmatter[] = [];

    for (const filePath of decisionFiles) {
      const doc = await this.readDocument(filePath);
      if (!doc) continue;

      const fm = doc.frontmatter as unknown as DecisionFrontmatter;

      // Apply filters
      if (filters.protocol && fm.protocol?.toLowerCase() !== filters.protocol.toLowerCase()) {
        continue;
      }
      if (filters.sector && !fm.sectors?.some(s => s.toLowerCase() === filters.sector!.toLowerCase())) {
        continue;
      }
      if (filters.outcome && fm.decision !== filters.outcome) {
        continue;
      }
      if (filters.dateRange) {
        if (fm.date < filters.dateRange.start || fm.date > filters.dateRange.end) {
          continue;
        }
      }

      decisions.push(fm);
    }

    // Sort by date descending
    decisions.sort((a, b) => b.date.localeCompare(a.date));

    return decisions.slice(0, filters.limit || 10);
  }

  /**
   * Get excerpt from a document
   */
  async getDocumentExcerpt(relativePath: string, maxLength: number = 200): Promise<string> {
    const doc = await this.readDocument(relativePath);
    if (!doc) return '';
    return extractExcerpt(doc.content, maxLength);
  }
}
