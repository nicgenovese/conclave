import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetVoterConcentration } from '../../src/tools/voting.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleGetVoterConcentration', () => {
  let mockCache: CacheManager;
  let mockSnapshotClient: Record<string, ReturnType<typeof vi.fn>>;
  let mockTallyClient: {
    getDelegates: ReturnType<typeof vi.fn>;
  };
  let mockKarmaClient: {
    getDelegates: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockSnapshotClient = {};
    mockTallyClient = {
      getDelegates: vi.fn()
    };
    mockKarmaClient = {
      getDelegates: vi.fn()
    };
  });

  it('should calculate concentration metrics', async () => {
    // Create a concentrated distribution (top 3 have 90%)
    mockKarmaClient.getDelegates.mockResolvedValue([
      { address: '0x1', delegatedVotes: '500000' },
      { address: '0x2', delegatedVotes: '300000' },
      { address: '0x3', delegatedVotes: '100000' },
      { address: '0x4', delegatedVotes: '50000' },
      { address: '0x5', delegatedVotes: '50000' }
    ]);
    mockTallyClient.getDelegates.mockResolvedValue([]);

    const result = await handleGetVoterConcentration(
      { protocol: 'aave' },
      {
        cache: mockCache,
        snapshotClient: mockSnapshotClient as any,
        tallyClient: mockTallyClient as any,
        karmaClient: mockKarmaClient as any
      }
    );

    expect(result.nakamotoCoefficient).toBeGreaterThan(0);
    expect(result.top10Power).toBeGreaterThan(0);
    expect(result.giniCoefficient).toBeGreaterThan(0);
    expect(result.giniCoefficient).toBeLessThanOrEqual(1);
    expect(['Decentralized', 'Moderate', 'Concentrated', 'Plutocratic']).toContain(result.concentrationRating);
  });

  it('should return Plutocratic for highly concentrated power', async () => {
    // Create extremely concentrated distribution
    mockKarmaClient.getDelegates.mockResolvedValue([
      { address: '0x1', delegatedVotes: '900000' },
      { address: '0x2', delegatedVotes: '50000' },
      { address: '0x3', delegatedVotes: '50000' }
    ]);
    mockTallyClient.getDelegates.mockResolvedValue([]);

    const result = await handleGetVoterConcentration(
      { protocol: 'aave' },
      {
        cache: mockCache,
        snapshotClient: mockSnapshotClient as any,
        tallyClient: mockTallyClient as any,
        karmaClient: mockKarmaClient as any
      }
    );

    expect(result.nakamotoCoefficient).toBe(1);
    expect(result.concentrationRating).toBe('Plutocratic');
  });

  it('should fallback to Tally when Karma returns empty', async () => {
    mockKarmaClient.getDelegates.mockResolvedValue([]);
    mockTallyClient.getDelegates.mockResolvedValue([
      { address: '0x1', votingPower: { total: '500000' } },
      { address: '0x2', votingPower: { total: '300000' } },
      { address: '0x3', votingPower: { total: '200000' } }
    ]);

    const result = await handleGetVoterConcentration(
      { protocol: 'compound' },
      {
        cache: mockCache,
        snapshotClient: mockSnapshotClient as any,
        tallyClient: mockTallyClient as any,
        karmaClient: mockKarmaClient as any
      }
    );

    expect(result.totalVoters).toBe(3);
    expect(result.nakamotoCoefficient).toBeGreaterThan(0);
  });

  it('should use cached results', async () => {
    mockKarmaClient.getDelegates.mockResolvedValue([
      { address: '0x1', delegatedVotes: '1000000' }
    ]);
    mockTallyClient.getDelegates.mockResolvedValue([]);

    // First call
    await handleGetVoterConcentration(
      { protocol: 'aave' },
      {
        cache: mockCache,
        snapshotClient: mockSnapshotClient as any,
        tallyClient: mockTallyClient as any,
        karmaClient: mockKarmaClient as any
      }
    );

    // Second call
    mockKarmaClient.getDelegates.mockClear();
    mockTallyClient.getDelegates.mockClear();

    await handleGetVoterConcentration(
      { protocol: 'aave' },
      {
        cache: mockCache,
        snapshotClient: mockSnapshotClient as any,
        tallyClient: mockTallyClient as any,
        karmaClient: mockKarmaClient as any
      }
    );

    expect(mockKarmaClient.getDelegates).not.toHaveBeenCalled();
  });
});
