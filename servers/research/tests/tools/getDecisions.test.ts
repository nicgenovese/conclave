import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetDecisions } from '../../src/tools/getDecisions.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleGetDecisions', () => {
  let mockCache: CacheManager;
  let mockArchiveManager: {
    listFiles: ReturnType<typeof vi.fn>;
    readDocument: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockArchiveManager = {
      listFiles: vi.fn(),
      readDocument: vi.fn()
    };
  });

  it('should return decisions for protocol', async () => {
    mockArchiveManager.listFiles.mockResolvedValue(['decisions/aave-2025-03-01.md']);
    mockArchiveManager.readDocument.mockResolvedValue({
      frontmatter: {
        protocol: 'aave',
        date: '2025-03-01',
        decision: 'go',
        conviction: 8,
        sectors: ['DeFi', 'Lending'],
        riskRating: 'medium'
      },
      content: '## Executive Decision\nAave is approved for investment.'
    });

    const result = await handleGetDecisions(
      { protocol: 'aave', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    expect(result.totalCount).toBe(1);
    expect(result.decisions[0].protocol).toBe('aave');
    expect(result.decisions[0].decision).toBe('go');
    expect(result.decisions[0].conviction).toBe(8);
  });

  it('should filter by outcome', async () => {
    mockArchiveManager.listFiles.mockResolvedValue([
      'decisions/aave-2025-03-01.md',
      'decisions/compound-2025-02-15.md'
    ]);
    mockArchiveManager.readDocument
      .mockResolvedValueOnce({
        frontmatter: {
          protocol: 'aave',
          date: '2025-03-01',
          decision: 'go',
          conviction: 8,
          sectors: ['DeFi']
        },
        content: ''
      })
      .mockResolvedValueOnce({
        frontmatter: {
          protocol: 'compound',
          date: '2025-02-15',
          decision: 'no-go',
          conviction: 3,
          sectors: ['DeFi']
        },
        content: ''
      });

    const result = await handleGetDecisions(
      { outcome: 'no-go', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].protocol).toBe('compound');
    expect(result.decisions[0].decision).toBe('no-go');
  });

  it('should filter by sector', async () => {
    mockArchiveManager.listFiles.mockResolvedValue([
      'decisions/aave-2025-03-01.md',
      'decisions/uniswap-2025-02-20.md'
    ]);
    mockArchiveManager.readDocument
      .mockResolvedValueOnce({
        frontmatter: {
          protocol: 'aave',
          date: '2025-03-01',
          decision: 'go',
          conviction: 8,
          sectors: ['DeFi', 'Lending']
        },
        content: ''
      })
      .mockResolvedValueOnce({
        frontmatter: {
          protocol: 'uniswap',
          date: '2025-02-20',
          decision: 'go',
          conviction: 7,
          sectors: ['DeFi', 'DEX']
        },
        content: ''
      });

    const result = await handleGetDecisions(
      { sector: 'Lending', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].protocol).toBe('aave');
  });

  it('should return empty when no decisions found', async () => {
    mockArchiveManager.listFiles.mockResolvedValue([]);

    const result = await handleGetDecisions(
      { protocol: 'nonexistent', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    expect(result.totalCount).toBe(0);
    expect(result.decisions).toHaveLength(0);
  });

  it('should use cached results', async () => {
    mockArchiveManager.listFiles.mockResolvedValue(['decisions/test-2025-01-01.md']);
    mockArchiveManager.readDocument.mockResolvedValue({
      frontmatter: {
        protocol: 'test',
        date: '2025-01-01',
        decision: 'go',
        conviction: 5,
        sectors: []
      },
      content: ''
    });

    // First call
    await handleGetDecisions(
      { protocol: 'test', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    // Second call
    mockArchiveManager.listFiles.mockClear();
    mockArchiveManager.readDocument.mockClear();
    await handleGetDecisions(
      { protocol: 'test', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager as any }
    );

    expect(mockArchiveManager.listFiles).not.toHaveBeenCalled();
  });
});
