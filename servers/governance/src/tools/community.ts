import { DiscourseClient } from '../clients/discourse.js';
import { TallyClient } from '../clients/tally.js';
import { KarmaClient } from '../clients/karma.js';
import type { CacheManager } from '../utils/cache.js';
import type {
  GetSentimentInput,
  GetSentimentOutput,
  Discussion,
  GetCommunityContributorsInput,
  GetCommunityContributorsOutput,
  Contributor
} from '../types/index.js';

interface CommunityContext {
  cache: CacheManager;
  discourseClient: DiscourseClient;
  tallyClient: TallyClient;
  karmaClient: KarmaClient;
}

export async function handleGetSentiment(
  input: GetSentimentInput,
  ctx: CommunityContext
): Promise<GetSentimentOutput> {
  const cacheKey = ctx.cache.generateKey('getSentiment', input);
  const cached = ctx.cache.get<GetSentimentOutput>(cacheKey);
  if (cached) return cached;

  const discussions: Discussion[] = [];
  let totalSentiment = 0;
  const topicCounts = new Map<string, number>();

  // Check if forum is supported
  if (!ctx.discourseClient.isForumSupported(input.protocol)) {
    return {
      discussions: [],
      averageSentiment: 0,
      discussionVolume: 0,
      topTopics: [],
      dataFreshness: new Date().toISOString()
    };
  }

  // Fetch latest topics from Discourse
  try {
    const topics = await ctx.discourseClient.getLatestTopics(input.protocol, {
      page: 0
    });

    // Filter by date range
    const now = Date.now();
    const periodMs = input.period === '7d' ? 7 * 24 * 60 * 60 * 1000
      : input.period === '30d' ? 30 * 24 * 60 * 60 * 1000
      : 90 * 24 * 60 * 60 * 1000;

    const filteredTopics = topics.filter(t => {
      const topicDate = new Date(t.createdAt).getTime();
      return now - topicDate <= periodMs;
    });

    for (const topic of filteredTopics.slice(0, input.limit)) {
      const sentimentAnalysis = ctx.discourseClient.analyzeSentiment(topic);

      discussions.push({
        id: topic.id.toString(),
        title: topic.title,
        category: topic.categoryName || `category-${topic.categoryId}`,
        sentiment: sentimentAnalysis.sentiment,
        sentimentScore: sentimentAnalysis.score,
        replyCount: topic.replyCount,
        viewCount: topic.viewCount,
        authorReputation: 0, // Would need user lookup
        timestamp: topic.createdAt,
        url: '' // Would need to construct from forum URL
      });

      totalSentiment += sentimentAnalysis.score;

      // Track topic keywords (simple extraction from title)
      const words = topic.title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4 && !['about', 'would', 'could', 'should', 'there', 'their', 'these', 'those'].includes(w));

      for (const word of words) {
        topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
      }
    }
  } catch (error) {
    console.error('Discourse sentiment fetch error:', error);
  }

  // Sort topics by frequency
  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  const averageSentiment = discussions.length > 0
    ? totalSentiment / discussions.length
    : 0;

  const result: GetSentimentOutput = {
    discussions,
    averageSentiment,
    discussionVolume: discussions.length,
    topTopics,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'sentiment');
  return result;
}

export async function handleGetCommunityContributors(
  input: GetCommunityContributorsInput,
  ctx: CommunityContext
): Promise<GetCommunityContributorsOutput> {
  const cacheKey = ctx.cache.generateKey('getCommunityContributors', input);
  const cached = ctx.cache.get<GetCommunityContributorsOutput>(cacheKey);
  if (cached) return cached;

  const contributorMap = new Map<string, Contributor>();
  let teamMemberCount = 0;

  // Fetch delegates from Karma (they include activity data)
  if (input.type === 'all' || input.type === 'delegates' || input.type === 'voters') {
    try {
      const delegates = await ctx.karmaClient.getDelegates(input.protocol, {
        limit: input.limit,
        field: 'karmaScore'
      });

      for (const d of delegates) {
        const addr = d.address.toLowerCase();
        contributorMap.set(addr, {
          address: d.address,
          ensName: d.ensName,
          type: 'delegate',
          activityScore: d.karmaScore,
          proposalsCreated: 0, // Karma doesn't provide this
          votesParticipated: Math.round((d.onChainVotesPct + d.offChainVotesPct) / 2),
          forumPosts: d.forumActivityScore,
          lastActive: d.lastVoteTimestamp || '',
          isTeamMember: d.status === 'recognized'
        });

        if (d.status === 'recognized') {
          teamMemberCount++;
        }
      }
    } catch (error) {
      console.error('Karma contributors fetch error:', error);
    }
  }

  // Fetch proposers from Tally
  if (input.type === 'all' || input.type === 'proposers') {
    try {
      const delegates = await ctx.tallyClient.getDelegates(input.protocol, {
        limit: input.limit
      });

      for (const d of delegates) {
        if (d.proposalsCreated === 0 && input.type === 'proposers') continue;

        const addr = d.address.toLowerCase();

        if (contributorMap.has(addr)) {
          // Update existing
          const existing = contributorMap.get(addr)!;
          existing.proposalsCreated = d.proposalsCreated;
          existing.votesParticipated = Math.max(existing.votesParticipated, d.votesCount);
          if (d.proposalsCreated > 0) {
            existing.type = 'proposer';
          }
        } else {
          contributorMap.set(addr, {
            address: d.address,
            ensName: d.ens,
            type: d.proposalsCreated > 0 ? 'proposer' : 'voter',
            activityScore: d.participationRate * 100,
            proposalsCreated: d.proposalsCreated,
            votesParticipated: d.votesCount,
            forumPosts: 0,
            lastActive: ''
          });
        }
      }
    } catch (error) {
      console.error('Tally contributors fetch error:', error);
    }
  }

  // Calculate diversity index (inverse of concentration)
  // Higher diversity = more equal participation
  const contributors = Array.from(contributorMap.values());
  const activityScores = contributors.map(c => c.activityScore).filter(s => s > 0);

  let diversityIndex = 0;
  if (activityScores.length > 1) {
    const avgScore = activityScores.reduce((a, b) => a + b, 0) / activityScores.length;
    const variance = activityScores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / activityScores.length;
    const stdDev = Math.sqrt(variance);
    // Lower coefficient of variation = more diverse participation
    const cv = avgScore > 0 ? stdDev / avgScore : 0;
    diversityIndex = Math.max(0, 1 - cv); // Invert so higher = better
  }

  const teamMemberPercent = contributors.length > 0
    ? (teamMemberCount / contributors.length) * 100
    : 0;

  // Sort by activity score
  contributors.sort((a, b) => b.activityScore - a.activityScore);

  // Estimate new contributors (would need historical data)
  const newContributors30d = Math.round(contributors.length * 0.1); // Rough estimate

  const result: GetCommunityContributorsOutput = {
    contributors: contributors.slice(0, input.limit),
    totalContributors: contributors.length,
    diversityIndex,
    teamMemberPercent,
    newContributors30d,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'default');
  return result;
}
