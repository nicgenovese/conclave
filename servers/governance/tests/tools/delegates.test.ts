import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetDelegates, handleGetDelegationGraph } from '../../src/tools/delegates.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleGetDelegates', () => {
  let mockCache: CacheManager;
  let mockSnapshotClient: {
    getDelegates: ReturnType<typeof vi.fn>;
  };
  let mockTallyClient: {
    getDelegates: ReturnType<typeof vi.fn>;
  };
  let mockKarmaClient: {
    getDelegates: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockSnapshotClient = {
      getDelegates: vi.fn()
    };
    mockTallyClient = {
      getDelegates: vi.fn()
    };
    mockKarmaClient = {
      getDelegates: vi.fn()
    };
  });

  it('should return delegates from Karma', async () => {
    mockKarmaClient.getDelegates.mockResolvedValue([
      {
        address: '0x123',
        ensName: 'delegate.eth',
        delegatedVotes: '1000000',
        delegatorCount: 50,
        karmaScore: 85,
        onChainVotesPct: 90,
        offChainVotesPct: 80,
        status: 'active'
      }
    ]);
    mockTallyClient.getDelegates.mockResolvedValue([]);

    const result = await handleGetDelegates(
      { protocol: 'aave', limit: 10, sortBy: 'votingPower' },
      {
        cache: mockCache,
        snapshotClient: mockSnapshotClient as any,
        tallyClient: mockTallyClient as any,
        karmaClient: mockKarmaClient as any
      }
    );

    expect(result.delegates.length).toBe(1);
    expect(result.delegates[0].address).toBe('0x123');
    expect(result.delegates[0].ensName).toBe('delegate.eth');
    expect(result.delegates[0].votingPower).toBe(1000000);
  });

  it('should merge delegate data from Tally', async () => {
    mockKarmaClient.getDelegates.mockResolvedValue([
      {
        address: '0x123',
        delegatedVotes: '1000000',
        delegatorCount: 50,
        karmaScore: 85,
        onChainVotesPct: 90,
        offChainVotesPct: 80,
        status: 'active'
      }
    ]);
    mockTallyClient.getDelegates.mockResolvedValue([
      {
        address: '0x123',
        ens: 'delegate.eth',
        votingPower: { total: '1000000', token: { symbol: 'AAVE' } },
        delegatorsCount: 50,
        proposalsCreated: 5,
        votesCount: 20,
        participationRate: 0.85,
        statement: { statement: 'I am a delegate' }
      }
    ]);

    const result = await handleGetDelegates(
      { protocol: 'aave', limit: 10, sortBy: 'votingPower' },
      {
        cache: mockCache,
        snapshotClient: mockSnapshotClient as any,
        tallyClient: mockTallyClient as any,
        karmaClient: mockKarmaClient as any
      }
    );

    expect(result.delegates[0].proposalsCreated).toBe(5);
    expect(result.delegates[0].votesParticipated).toBe(20);
    expect(result.delegates[0].statement).toBe('I am a delegate');
  });

  it('should calculate voting power percentages', async () => {
    mockKarmaClient.getDelegates.mockResolvedValue([
      { address: '0x1', delegatedVotes: '600000', delegatorCount: 30, karmaScore: 80, onChainVotesPct: 90, offChainVotesPct: 80, status: 'active' },
      { address: '0x2', delegatedVotes: '400000', delegatorCount: 20, karmaScore: 70, onChainVotesPct: 80, offChainVotesPct: 70, status: 'active' }
    ]);
    mockTallyClient.getDelegates.mockResolvedValue([]);

    const result = await handleGetDelegates(
      { protocol: 'aave', limit: 10, sortBy: 'votingPower' },
      {
        cache: mockCache,
        snapshotClient: mockSnapshotClient as any,
        tallyClient: mockTallyClient as any,
        karmaClient: mockKarmaClient as any
      }
    );

    expect(result.delegates[0].votingPowerPercent).toBe(60);
    expect(result.delegates[1].votingPowerPercent).toBe(40);
  });
});

describe('handleGetDelegationGraph', () => {
  let mockCache: CacheManager;
  let mockSnapshotClient: {
    getDelegates: ReturnType<typeof vi.fn>;
  };
  let mockTallyClient: {
    getDelegationInfo: ReturnType<typeof vi.fn>;
  };
  let mockKarmaClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockCache = new CacheManager();
    mockSnapshotClient = {
      getDelegates: vi.fn()
    };
    mockTallyClient = {
      getDelegationInfo: vi.fn()
    };
    mockKarmaClient = {};
  });

  it('should build delegation graph', async () => {
    mockSnapshotClient.getDelegates.mockResolvedValue([
      { delegator: '0x1', delegate: '0x2', space: 'aave.eth' },
      { delegator: '0x2', delegate: '0x3', space: 'aave.eth' },
      { delegator: '0x4', delegate: '0x3', space: 'aave.eth' }
    ]);
    mockTallyClient.getDelegationInfo.mockResolvedValue(null);

    const result = await handleGetDelegationGraph(
      { protocol: 'aave', depth: 2 },
      {
        cache: mockCache,
        snapshotClient: mockSnapshotClient as any,
        tallyClient: mockTallyClient as any,
        karmaClient: mockKarmaClient as any
      }
    );

    expect(result.delegationEdges.length).toBeGreaterThan(0);
    expect(result).toHaveProperty('delegationDensity');
    expect(result).toHaveProperty('maxDelegationDepth');
  });

  it('should detect circular delegations', async () => {
    mockSnapshotClient.getDelegates.mockResolvedValue([
      { delegator: '0x1', delegate: '0x2', space: 'aave.eth' },
      { delegator: '0x2', delegate: '0x3', space: 'aave.eth' },
      { delegator: '0x3', delegate: '0x1', space: 'aave.eth' } // Circular
    ]);
    mockTallyClient.getDelegationInfo.mockResolvedValue(null);

    const result = await handleGetDelegationGraph(
      { protocol: 'aave', depth: 3 },
      {
        cache: mockCache,
        snapshotClient: mockSnapshotClient as any,
        tallyClient: mockTallyClient as any,
        karmaClient: mockKarmaClient as any
      }
    );

    expect(result.circularDelegations.length).toBeGreaterThan(0);
  });
});
