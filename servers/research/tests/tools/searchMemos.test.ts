import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSearchMemos } from '../../src/tools/searchMemos.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleSearchMemos', () => {
  let mockCache: CacheManager;
  let mockArchiveManager: {
    searchDocuments: ReturnType<typeof vi.fn>;
    getDocumentExcerpt: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockArchiveManager = {
      searchDocuments: vi.fn(),
      getDocumentExcerpt: vi.fn()
    };
  });

  it('should return search results for protocol', async () => {
    mockArchiveManager.searchDocuments.mockResolvedValue([
      {
        id: 'memo-aave-2025-03-01',
        type: 'memo',
        protocol: 'aave',
        date: '2025-03-01',
        path: 'memos/aave-2025-03-01.md',
        title: 'Aave Analysis',
        tags: ['DeFi', 'Lending'],
        matchScore: 10
      }
    ]);
    mockArchiveManager.getDocumentExcerpt.mockResolvedValue('This is an excerpt about Aave...');

    const result = await handleSearchMemos(
      { protocol: 'aave', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.totalResults).toBe(1);
    expect(result.memos[0].protocol).toBe('aave');
    expect(result.memos[0].title).toBe('Aave Analysis');
    expect(result.memos[0].excerpt).toBe('This is an excerpt about Aave...');
    expect(result).toHaveProperty('searchPerformed');
  });

  it('should return empty results when no matches', async () => {
    mockArchiveManager.searchDocuments.mockResolvedValue([]);

    const result = await handleSearchMemos(
      { protocol: 'nonexistent', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.totalResults).toBe(0);
    expect(result.memos).toHaveLength(0);
  });

  it('should use cached results when available', async () => {
    mockArchiveManager.searchDocuments.mockResolvedValue([
      {
        id: 'memo-test',
        protocol: 'test',
        path: 'memos/test.md',
        title: 'Test',
        tags: [],
        matchScore: 5
      }
    ]);
    mockArchiveManager.getDocumentExcerpt.mockResolvedValue('Excerpt');

    // First call
    await handleSearchMemos(
      { protocol: 'test', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    // Second call should use cache
    mockArchiveManager.searchDocuments.mockClear();
    await handleSearchMemos(
      { protocol: 'test', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.searchDocuments).not.toHaveBeenCalled();
  });

  it('should pass keywords to search', async () => {
    mockArchiveManager.searchDocuments.mockResolvedValue([]);

    await handleSearchMemos(
      { protocol: 'aave', keywords: ['governance', 'risk'], limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.searchDocuments).toHaveBeenCalledWith(
      'aave',
      expect.objectContaining({
        keywords: ['governance', 'risk']
      })
    );
  });

  it('should pass date range to search', async () => {
    mockArchiveManager.searchDocuments.mockResolvedValue([]);

    await handleSearchMemos(
      {
        protocol: 'aave',
        dateRange: { start: '2025-01-01', end: '2025-03-01' },
        limit: 10
      },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.searchDocuments).toHaveBeenCalledWith(
      'aave',
      expect.objectContaining({
        dateRange: { start: '2025-01-01', end: '2025-03-01' }
      })
    );
  });
});
