import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetProposals, handleGetProposalSuccessRate } from '../../src/tools/proposals.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleGetProposals', () => {
  let mockCache: CacheManager;
  let mockSnapshotClient: {
    getProposals: ReturnType<typeof vi.fn>;
  };
  let mockTallyClient: {
    getProposals: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockSnapshotClient = {
      getProposals: vi.fn()
    };
    mockTallyClient = {
      getProposals: vi.fn()
    };
  });

  it('should return proposals from Snapshot', async () => {
    mockSnapshotClient.getProposals.mockResolvedValue([
      {
        id: 'snap-1',
        title: 'Test Proposal',
        state: 'closed',
        start: Math.floor(Date.now() / 1000) - 86400,
        end: Math.floor(Date.now() / 1000),
        author: '0x123',
        scores: [100, 50],
        scores_total: 150,
        quorum: 100,
        votes: 10,
        choices: ['For', 'Against'],
        link: 'https://snapshot.org/test'
      }
    ]);
    mockTallyClient.getProposals.mockResolvedValue([]);

    const result = await handleGetProposals(
      { protocol: 'aave', limit: 10, status: 'all', period: '90d' },
      { cache: mockCache, snapshotClient: mockSnapshotClient as any, tallyClient: mockTallyClient as any }
    );

    expect(result.proposals.length).toBe(1);
    expect(result.proposals[0].title).toBe('Test Proposal');
    expect(result.proposals[0].source).toBe('snapshot');
    expect(result.proposals[0].status).toBe('Passed');
  });

  it('should return proposals from Tally', async () => {
    mockSnapshotClient.getProposals.mockResolvedValue([]);
    mockTallyClient.getProposals.mockResolvedValue([
      {
        id: 'tally-1',
        title: 'On-chain Proposal',
        status: 'EXECUTED',
        createdAt: new Date().toISOString(),
        proposer: { address: '0x456' },
        voteStats: [
          { support: 'FOR', weight: '1000', votes: '5', percent: 70 },
          { support: 'AGAINST', weight: '400', votes: '2', percent: 30 }
        ],
        quorum: '500',
        startBlock: 1000,
        endBlock: 2000
      }
    ]);

    const result = await handleGetProposals(
      { protocol: 'compound', limit: 10, status: 'all', period: '90d' },
      { cache: mockCache, snapshotClient: mockSnapshotClient as any, tallyClient: mockTallyClient as any }
    );

    expect(result.proposals.length).toBe(1);
    expect(result.proposals[0].title).toBe('On-chain Proposal');
    expect(result.proposals[0].source).toBe('tally');
    expect(result.proposals[0].status).toBe('Executed');
  });

  it('should filter by status', async () => {
    mockSnapshotClient.getProposals.mockResolvedValue([
      {
        id: 'snap-active',
        title: 'Active Proposal',
        state: 'active',
        start: Math.floor(Date.now() / 1000) - 3600,
        end: Math.floor(Date.now() / 1000) + 3600,
        author: '0x123',
        scores: [0, 0],
        scores_total: 0,
        quorum: 100,
        votes: 0,
        choices: ['For', 'Against'],
        link: ''
      }
    ]);
    mockTallyClient.getProposals.mockResolvedValue([]);

    const result = await handleGetProposals(
      { protocol: 'aave', limit: 10, status: 'active', period: '90d' },
      { cache: mockCache, snapshotClient: mockSnapshotClient as any, tallyClient: mockTallyClient as any }
    );

    expect(result.proposals.length).toBe(1);
    expect(result.proposals[0].status).toBe('Active');
  });

  it('should use cached results', async () => {
    mockSnapshotClient.getProposals.mockResolvedValue([]);
    mockTallyClient.getProposals.mockResolvedValue([]);

    // First call
    await handleGetProposals(
      { protocol: 'aave', limit: 10, status: 'all', period: '90d' },
      { cache: mockCache, snapshotClient: mockSnapshotClient as any, tallyClient: mockTallyClient as any }
    );

    // Second call
    mockSnapshotClient.getProposals.mockClear();
    mockTallyClient.getProposals.mockClear();

    await handleGetProposals(
      { protocol: 'aave', limit: 10, status: 'all', period: '90d' },
      { cache: mockCache, snapshotClient: mockSnapshotClient as any, tallyClient: mockTallyClient as any }
    );

    expect(mockSnapshotClient.getProposals).not.toHaveBeenCalled();
    expect(mockTallyClient.getProposals).not.toHaveBeenCalled();
  });
});

describe('handleGetProposalSuccessRate', () => {
  let mockCache: CacheManager;
  let mockSnapshotClient: {
    getProposals: ReturnType<typeof vi.fn>;
  };
  let mockTallyClient: {
    getProposals: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCache = new CacheManager();
    mockSnapshotClient = {
      getProposals: vi.fn()
    };
    mockTallyClient = {
      getProposals: vi.fn()
    };
  });

  it('should calculate success rates', async () => {
    mockSnapshotClient.getProposals.mockResolvedValue([
      { id: '1', scores: [100, 50], scores_total: 150, quorum: 100, votes: 10 },
      { id: '2', scores: [30, 70], scores_total: 100, quorum: 50, votes: 5 }
    ]);
    mockTallyClient.getProposals.mockResolvedValue([
      { id: 't1', status: 'EXECUTED', voteStats: [{ votes: '10' }], quorum: '0' },
      { id: 't2', status: 'DEFEATED', voteStats: [{ votes: '5' }], quorum: '0' }
    ]);

    const result = await handleGetProposalSuccessRate(
      { protocol: 'aave', period: '1y' },
      { cache: mockCache, snapshotClient: mockSnapshotClient as any, tallyClient: mockTallyClient as any }
    );

    expect(result.totalProposals).toBe(4);
    expect(result.passingRate).toBeGreaterThan(0);
    expect(result).toHaveProperty('executionRate');
  });
});
