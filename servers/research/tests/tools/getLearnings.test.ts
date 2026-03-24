import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetLearnings } from '../../src/tools/getLearnings.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleGetLearnings', () => {
  let mockCache: CacheManager;
  let mockArchiveManager: {
    readDocument: ReturnType<typeof vi.fn>;
  };

  const mockPatternsContent = `# DeFi Patterns & Learnings

## Success Factors

### Strong Liquidity Mining Programs
- **Description**: Protocols with well-designed token distribution attract sustained liquidity
- **Supporting Evidence**: Compound, Aave, and Uniswap all launched with successful mining programs
- **Confidence**: high
- **Tags**: [tokenomics, liquidity]

### Active Governance Participation
- **Description**: Protocols with engaged communities show better long-term performance
- **Supporting Evidence**: Multiple case studies show correlation between participation and protocol health
- **Confidence**: medium
- **Tags**: [governance, community]

## Market Cycles

### DeFi Summer Pattern
- **Description**: Yield farming cycles tend to follow Bitcoin halvings
- **Supporting Evidence**: 2020 DeFi summer occurred months after BTC halving
- **Confidence**: medium
- **Tags**: [market, cycles]

## Warning Signs

### Declining TVL Trend
- **Description**: Sustained TVL decline over 30+ days often precedes major issues
- **Supporting Evidence**: Multiple protocols showed this pattern before exploits
- **Confidence**: high
- **Tags**: [risk, tvl]
`;

  const mockRedFlagsContent = `# Red Flags

## Smart Contract

### Unverified Contracts
- **Description**: Protocols with unverified source code
- **Confidence**: high
- **Tags**: [security]
`;

  beforeEach(() => {
    mockCache = new CacheManager();
    mockArchiveManager = {
      readDocument: vi.fn()
    };
  });

  it('should return learnings for patterns type', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    const result = await handleGetLearnings(
      { learningType: 'patterns', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.learningType).toBe('patterns');
    expect(result.items.length).toBeGreaterThan(0);
    expect(result).toHaveProperty('lastUpdated');
  });

  it('should parse learning item properties correctly', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    const result = await handleGetLearnings(
      { learningType: 'patterns', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    const item = result.items[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('title');
    expect(item).toHaveProperty('description');
    expect(item).toHaveProperty('confidence');
    expect(item).toHaveProperty('tags');
    expect(item).toHaveProperty('lastUpdated');
  });

  it('should read correct file for learning type', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockRedFlagsContent });

    await handleGetLearnings(
      { learningType: 'red-flags', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.readDocument).toHaveBeenCalledWith('learnings/red-flags.md');
  });

  it('should read sector-specific file when sector provided', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    await handleGetLearnings(
      { learningType: 'patterns', sector: 'lending', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.readDocument).toHaveBeenCalledWith('learnings/lending-patterns.md');
  });

  it('should parse confidence levels correctly', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    const result = await handleGetLearnings(
      { learningType: 'patterns', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    const confidences = result.items.map(i => i.confidence);
    expect(confidences.every(c => ['low', 'medium', 'high'].includes(c))).toBe(true);
  });

  it('should respect limit parameter', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    const result = await handleGetLearnings(
      { learningType: 'patterns', limit: 2 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.items.length).toBeLessThanOrEqual(2);
  });

  it('should return empty results when document not found', async () => {
    mockArchiveManager.readDocument.mockResolvedValue(null);

    const result = await handleGetLearnings(
      { learningType: 'patterns', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.items.length).toBe(0);
  });

  it('should use cached data when available', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    // First call
    await handleGetLearnings(
      { learningType: 'patterns', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    // Second call should use cache
    mockArchiveManager.readDocument.mockClear();

    await handleGetLearnings(
      { learningType: 'patterns', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.readDocument).not.toHaveBeenCalled();
  });

  it('should handle success-factors learning type', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    const result = await handleGetLearnings(
      { learningType: 'success-factors', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.learningType).toBe('success-factors');
  });

  it('should handle market-cycles learning type', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    const result = await handleGetLearnings(
      { learningType: 'market-cycles', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.learningType).toBe('market-cycles');
  });

  it('should include tags array', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    const result = await handleGetLearnings(
      { learningType: 'patterns', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.items.every(i => Array.isArray(i.tags))).toBe(true);
  });

  it('should handle empty content gracefully', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: '' });

    const result = await handleGetLearnings(
      { learningType: 'patterns', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(result.items.length).toBe(0);
  });

  it('should generate unique IDs for each learning item', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    const result = await handleGetLearnings(
      { learningType: 'patterns', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    const ids = result.items.map(i => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should default to defi-patterns file when no sector provided', async () => {
    mockArchiveManager.readDocument.mockResolvedValue({ content: mockPatternsContent });

    await handleGetLearnings(
      { learningType: 'patterns', limit: 10 },
      { cache: mockCache, archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.readDocument).toHaveBeenCalledWith('learnings/defi-patterns.md');
  });
});
