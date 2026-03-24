import type { ArchiveManager } from '../archive/manager.js';
import type { CacheManager } from '../utils/cache.js';
import type { SearchMemosInput, SearchMemosOutput } from '../types/index.js';

interface SearchMemosContext {
  cache: CacheManager;
  archiveManager: ArchiveManager;
}

export async function handleSearchMemos(
  input: SearchMemosInput,
  ctx: SearchMemosContext
): Promise<SearchMemosOutput> {
  // Check cache
  const cacheKey = ctx.cache.generateKey('searchMemos', {
    protocol: input.protocol,
    keywords: input.keywords?.join(','),
    dateRange: input.dateRange ? `${input.dateRange.start}-${input.dateRange.end}` : '',
    limit: input.limit
  });
  const cached = ctx.cache.get<SearchMemosOutput>(cacheKey);
  if (cached) return cached;

  // Search documents
  const searchResults = await ctx.archiveManager.searchDocuments(input.protocol, {
    keywords: input.keywords,
    type: 'memo',
    dateRange: input.dateRange,
    limit: input.limit
  });

  // Get excerpts for each result
  const memos = await Promise.all(
    searchResults.map(async (doc) => {
      const excerpt = await ctx.archiveManager.getDocumentExcerpt(doc.path, 200);
      return {
        id: doc.id,
        protocol: doc.protocol || input.protocol,
        date: doc.date || '',
        title: doc.title,
        excerpt,
        path: doc.path,
        matchScore: doc.matchScore,
        tags: doc.tags
      };
    })
  );

  const result: SearchMemosOutput = {
    totalResults: memos.length,
    memos,
    searchPerformed: new Date().toISOString()
  };

  // Cache result
  ctx.cache.set(cacheKey, result, 'searchResults');

  return result;
}
