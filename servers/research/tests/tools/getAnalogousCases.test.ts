import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetAnalogousCases } from '../../src/tools/getAnalogousCases.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleGetAnalogousCases', () => {
  let mockCache: CacheManager;
  let mockArchiveManager: {
    getDecisions: ReturnType<typeof vi.fn>;
  };

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 86400000);
  const oneYearAgo = new Date(now.getTime() - 365 * 86400000);

  const mockDecisions = [
    {
      protocol: 'compound',
      date: threeMonthsAgo.toISOString().split('T')[0],
      decision: 'BUY',
      conviction: 8,
      sectors: ['lending', 'defi']
    },
    {
      protocol: 'maker',
      date: threeMonthsAgo.toISOString().split('T')[0],
      decision: 'HOLD',
      conviction: 6,
      sectors: ['lending', 'stablecoin']
    },
    {
      protocol: 'uniswap',
      date: oneYearAgo.toISOString().split('T')[0],
      decision: 'BUY',
      conviction: 9,
      sectors: ['dex', 'defi']
    },
    {
      protocol: 'aave',
      date: threeMonthsAgo.toISOString().split('T')[0],
      decision: 'BUY',
      conviction: 7,
      sectors: ['lending', 'defi']
    }
  ];

  beforeEach(() => {
    mockCache = new CacheManager();
    mockArchiveManager = {
      getDecisions: vi.fn()
    };
  });

  it('should return analogous cases for protocol', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    const result = await handleGetAnalogousCases(
      { protocol: 'aave', limit: 5 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.targetProtocol).toBe('aave');
    expect(result.analogousCases.length).toBeGreaterThan(0);
    // Should not include the target protocol itself
    expect(result.analogousCases.every(c => c.protocol !== 'aave')).toBe(true);
  });

  it('should filter by sector when provided', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    const result = await handleGetAnalogousCases(
      { protocol: 'aave', sector: 'lending', limit: 5 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    // Should prioritize lending protocols
    expect(result.analogousCases.length).toBeGreaterThan(0);
    // Compound and Maker are lending protocols
    const lendingCases = result.analogousCases.filter(
      c => c.protocol === 'compound' || c.protocol === 'maker'
    );
    expect(lendingCases.length).toBeGreaterThan(0);
  });

  it('should calculate similarity scores', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    const result = await handleGetAnalogousCases(
      { protocol: 'aave', sector: 'lending', limit: 5 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.analogousCases.every(c => c.similarityScore >= 0 && c.similarityScore <= 1)).toBe(true);
    expect(result.analogousCases.every(c => Array.isArray(c.similarityReasons))).toBe(true);
  });

  it('should prioritize recent decisions', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    const result = await handleGetAnalogousCases(
      { protocol: 'test', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    // Recent decisions should have higher scores
    const recentCases = result.analogousCases.filter(c =>
      c.similarityReasons.includes('Recent decision')
    );
    expect(recentCases.length).toBeGreaterThan(0);
  });

  it('should respect limit parameter', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    const result = await handleGetAnalogousCases(
      { protocol: 'test', limit: 2 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.analogousCases.length).toBeLessThanOrEqual(2);
  });

  it('should return empty results for missing protocol', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    const result = await handleGetAnalogousCases(
      { protocol: '', limit: 5 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.targetProtocol).toBe('');
    expect(result.analogousCases.length).toBe(0);
  });

  it('should include decision and conviction in results', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    const result = await handleGetAnalogousCases(
      { protocol: 'test', limit: 5 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.analogousCases.every(c => c.decision !== undefined)).toBe(true);
    expect(result.analogousCases.every(c => c.conviction >= 0 && c.conviction <= 10)).toBe(true);
  });

  it('should use cached data when available', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    // First call
    await handleGetAnalogousCases(
      { protocol: 'aave', limit: 5 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    // Second call should use cache
    mockArchiveManager.getDecisions.mockClear();

    await handleGetAnalogousCases(
      { protocol: 'aave', limit: 5 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.getDecisions).not.toHaveBeenCalled();
  });

  it('should prioritize high conviction decisions', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    const result = await handleGetAnalogousCases(
      { protocol: 'test', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    const highConvictionCases = result.analogousCases.filter(c =>
      c.similarityReasons.includes('High conviction decision')
    );
    expect(highConvictionCases.length).toBeGreaterThan(0);
  });

  it('should handle thesis matching', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    const result = await handleGetAnalogousCases(
      { protocol: 'test', thesis: 'lending protocol with strong governance', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    // Lending-related decisions should be prioritized
    expect(result.analogousCases.length).toBeGreaterThan(0);
  });

  it('should include outcome information', async () => {
    mockArchiveManager.getDecisions.mockResolvedValue(mockDecisions);

    const result = await handleGetAnalogousCases(
      { protocol: 'test', limit: 5 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.analogousCases.every(c => c.outcome !== undefined)).toBe(true);
    expect(result.analogousCases.every(c => typeof c.outcome.realized === 'boolean')).toBe(true);
  });
});
