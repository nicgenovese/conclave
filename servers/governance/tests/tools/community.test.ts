import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetSentiment, handleGetCommunityContributors } from '../../src/tools/community.js';
import { CacheManager } from '../../src/utils/cache.js';

describe('handleGetSentiment', () => {
  let mockCache: CacheManager;
  let mockDiscourseClient: {
    isForumSupported: ReturnType<typeof vi.fn>;
    getLatestTopics: ReturnType<typeof vi.fn>;
    analyzeSentiment: ReturnType<typeof vi.fn>;
  };
  let mockTallyClient: Record<string, ReturnType<typeof vi.fn>>;
  let mockKarmaClient: Record<string, ReturnType<typeof vi.fn>>;

  const mockTopics = [
    {
      id: 1,
      title: 'Great proposal for improving governance',
      categoryId: 1,
      categoryName: 'Governance',
      createdAt: new Date().toISOString(),
      replyCount: 10,
      viewCount: 100
    },
    {
      id: 2,
      title: 'Concerns about recent tokenomics changes',
      categoryId: 2,
      categoryName: 'Discussion',
      createdAt: new Date().toISOString(),
      replyCount: 25,
      viewCount: 500
    }
  ];

  beforeEach(() => {
    mockCache = new CacheManager();
    mockDiscourseClient = {
      isForumSupported: vi.fn().mockReturnValue(true),
      getLatestTopics: vi.fn(),
      analyzeSentiment: vi.fn()
    };
    mockTallyClient = {};
    mockKarmaClient = {};
  });

  it('should return sentiment analysis for protocol', async () => {
    mockDiscourseClient.getLatestTopics.mockResolvedValue(mockTopics);
    mockDiscourseClient.analyzeSentiment.mockReturnValue({ sentiment: 'positive', score: 0.7 });

    const result = await handleGetSentiment(
      { protocol: 'aave', period: '7d', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient, tallyClient: mockTallyClient as any, karmaClient: mockKarmaClient as any }
    );

    expect(result.discussions.length).toBe(2);
    expect(result.averageSentiment).toBe(0.7);
    expect(result.discussionVolume).toBe(2);
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should return empty results for unsupported protocol', async () => {
    mockDiscourseClient.isForumSupported.mockReturnValue(false);

    const result = await handleGetSentiment(
      { protocol: 'unsupported', period: '7d', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient, tallyClient: mockTallyClient as any, karmaClient: mockKarmaClient as any }
    );

    expect(result.discussions.length).toBe(0);
    expect(result.averageSentiment).toBe(0);
    expect(result.discussionVolume).toBe(0);
  });

  it('should extract top topics from discussions', async () => {
    mockDiscourseClient.getLatestTopics.mockResolvedValue(mockTopics);
    mockDiscourseClient.analyzeSentiment.mockReturnValue({ sentiment: 'neutral', score: 0.5 });

    const result = await handleGetSentiment(
      { protocol: 'aave', period: '30d', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient, tallyClient: mockTallyClient as any, karmaClient: mockKarmaClient as any }
    );

    expect(result.topTopics).toBeDefined();
    expect(Array.isArray(result.topTopics)).toBe(true);
  });

  it('should filter by period', async () => {
    const oldTopic = {
      id: 3,
      title: 'Old discussion',
      categoryId: 1,
      categoryName: 'Archive',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), // 60 days ago
      replyCount: 5,
      viewCount: 50
    };
    mockDiscourseClient.getLatestTopics.mockResolvedValue([...mockTopics, oldTopic]);
    mockDiscourseClient.analyzeSentiment.mockReturnValue({ sentiment: 'positive', score: 0.6 });

    const result = await handleGetSentiment(
      { protocol: 'aave', period: '30d', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient, tallyClient: mockTallyClient as any, karmaClient: mockKarmaClient as any }
    );

    // Old topic should be filtered out
    expect(result.discussions.length).toBe(2);
  });

  it('should use cached data when available', async () => {
    mockDiscourseClient.getLatestTopics.mockResolvedValue(mockTopics);
    mockDiscourseClient.analyzeSentiment.mockReturnValue({ sentiment: 'positive', score: 0.5 });

    // First call
    await handleGetSentiment(
      { protocol: 'aave', period: '7d', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient, tallyClient: mockTallyClient as any, karmaClient: mockKarmaClient as any }
    );

    // Second call should use cache
    mockDiscourseClient.getLatestTopics.mockClear();

    await handleGetSentiment(
      { protocol: 'aave', period: '7d', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient, tallyClient: mockTallyClient as any, karmaClient: mockKarmaClient as any }
    );

    expect(mockDiscourseClient.getLatestTopics).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockDiscourseClient.getLatestTopics.mockRejectedValue(new Error('API Error'));

    const result = await handleGetSentiment(
      { protocol: 'aave', period: '7d', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient, tallyClient: mockTallyClient as any, karmaClient: mockKarmaClient as any }
    );

    expect(result.discussions.length).toBe(0);
    expect(result.averageSentiment).toBe(0);
  });
});

describe('handleGetCommunityContributors', () => {
  let mockCache: CacheManager;
  let mockDiscourseClient: Record<string, ReturnType<typeof vi.fn>>;
  let mockTallyClient: {
    getDelegates: ReturnType<typeof vi.fn>;
  };
  let mockKarmaClient: {
    getDelegates: ReturnType<typeof vi.fn>;
  };

  const mockKarmaDelegates = [
    {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      ensName: 'delegate1.eth',
      karmaScore: 85,
      onChainVotesPct: 80,
      offChainVotesPct: 90,
      forumActivityScore: 70,
      lastVoteTimestamp: new Date().toISOString(),
      status: 'recognized'
    },
    {
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      ensName: 'delegate2.eth',
      karmaScore: 65,
      onChainVotesPct: 60,
      offChainVotesPct: 70,
      forumActivityScore: 50,
      lastVoteTimestamp: new Date().toISOString(),
      status: 'active'
    }
  ];

  const mockTallyDelegates = [
    {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      ens: 'delegate1.eth',
      proposalsCreated: 3,
      votesCount: 25,
      participationRate: 0.85
    },
    {
      address: '0xfedcba0987654321fedcba0987654321fedcba09',
      ens: 'proposer.eth',
      proposalsCreated: 5,
      votesCount: 30,
      participationRate: 0.9
    }
  ];

  beforeEach(() => {
    mockCache = new CacheManager();
    mockDiscourseClient = {};
    mockTallyClient = {
      getDelegates: vi.fn()
    };
    mockKarmaClient = {
      getDelegates: vi.fn()
    };
  });

  it('should return community contributors', async () => {
    mockKarmaClient.getDelegates.mockResolvedValue(mockKarmaDelegates);
    mockTallyClient.getDelegates.mockResolvedValue(mockTallyDelegates);

    const result = await handleGetCommunityContributors(
      { protocol: 'aave', type: 'all', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient as any, tallyClient: mockTallyClient, karmaClient: mockKarmaClient }
    );

    expect(result.contributors.length).toBeGreaterThan(0);
    expect(result.totalContributors).toBeGreaterThan(0);
    expect(result).toHaveProperty('diversityIndex');
    expect(result).toHaveProperty('teamMemberPercent');
    expect(result).toHaveProperty('dataFreshness');
  });

  it('should calculate team member percentage', async () => {
    mockKarmaClient.getDelegates.mockResolvedValue(mockKarmaDelegates);
    mockTallyClient.getDelegates.mockResolvedValue([]);

    const result = await handleGetCommunityContributors(
      { protocol: 'aave', type: 'delegates', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient as any, tallyClient: mockTallyClient, karmaClient: mockKarmaClient }
    );

    // 1 out of 2 is recognized (50%)
    expect(result.teamMemberPercent).toBe(50);
  });

  it('should merge data from Karma and Tally', async () => {
    mockKarmaClient.getDelegates.mockResolvedValue(mockKarmaDelegates);
    mockTallyClient.getDelegates.mockResolvedValue(mockTallyDelegates);

    const result = await handleGetCommunityContributors(
      { protocol: 'aave', type: 'all', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient as any, tallyClient: mockTallyClient, karmaClient: mockKarmaClient }
    );

    // Should have 3 unique contributors
    expect(result.totalContributors).toBe(3);

    // Common address should have merged data
    const mergedContributor = result.contributors.find(
      c => c.address === '0x1234567890abcdef1234567890abcdef12345678'
    );
    expect(mergedContributor).toBeDefined();
    expect(mergedContributor?.proposalsCreated).toBe(3);
  });

  it('should filter by contributor type', async () => {
    mockKarmaClient.getDelegates.mockResolvedValue(mockKarmaDelegates);
    mockTallyClient.getDelegates.mockResolvedValue(mockTallyDelegates);

    const result = await handleGetCommunityContributors(
      { protocol: 'aave', type: 'proposers', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient as any, tallyClient: mockTallyClient, karmaClient: mockKarmaClient }
    );

    expect(result.contributors.every(c => c.proposalsCreated > 0)).toBe(true);
  });

  it('should use cached data when available', async () => {
    mockKarmaClient.getDelegates.mockResolvedValue(mockKarmaDelegates);
    mockTallyClient.getDelegates.mockResolvedValue(mockTallyDelegates);

    // First call
    await handleGetCommunityContributors(
      { protocol: 'aave', type: 'all', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient as any, tallyClient: mockTallyClient, karmaClient: mockKarmaClient }
    );

    // Second call should use cache
    mockKarmaClient.getDelegates.mockClear();
    mockTallyClient.getDelegates.mockClear();

    await handleGetCommunityContributors(
      { protocol: 'aave', type: 'all', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient as any, tallyClient: mockTallyClient, karmaClient: mockKarmaClient }
    );

    expect(mockKarmaClient.getDelegates).not.toHaveBeenCalled();
    expect(mockTallyClient.getDelegates).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockKarmaClient.getDelegates.mockRejectedValue(new Error('API Error'));
    mockTallyClient.getDelegates.mockResolvedValue(mockTallyDelegates);

    const result = await handleGetCommunityContributors(
      { protocol: 'aave', type: 'all', limit: 10 },
      { cache: mockCache, discourseClient: mockDiscourseClient as any, tallyClient: mockTallyClient, karmaClient: mockKarmaClient }
    );

    // Should still return Tally data
    expect(result.contributors.length).toBeGreaterThan(0);
  });
});
