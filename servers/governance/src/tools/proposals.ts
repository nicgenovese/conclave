import { SnapshotClient } from '../clients/snapshot.js';
import { TallyClient } from '../clients/tally.js';
import type { CacheManager } from '../utils/cache.js';
import type {
  GetProposalsInput,
  GetProposalsOutput,
  Proposal,
  GetProposalPipelineInput,
  GetProposalPipelineOutput,
  PipelineProposal,
  GetProposalSuccessRateInput,
  GetProposalSuccessRateOutput
} from '../types/index.js';

interface ProposalsContext {
  cache: CacheManager;
  snapshotClient: SnapshotClient;
  tallyClient: TallyClient;
}

function mapSnapshotStatus(state: string): Proposal['status'] {
  switch (state) {
    case 'active': return 'Active';
    case 'pending': return 'Pending';
    case 'closed': return 'Passed'; // Snapshot doesn't distinguish passed/failed
    default: return 'Pending';
  }
}

function mapTallyStatus(status: string): Proposal['status'] {
  const s = status.toLowerCase();
  if (s.includes('active')) return 'Active';
  if (s.includes('pending') || s.includes('queued')) return 'Pending';
  if (s.includes('executed')) return 'Executed';
  if (s.includes('canceled') || s.includes('cancelled')) return 'Canceled';
  if (s.includes('defeated') || s.includes('failed')) return 'Failed';
  if (s.includes('succeeded') || s.includes('passed')) return 'Passed';
  return 'Pending';
}

export async function handleGetProposals(
  input: GetProposalsInput,
  ctx: ProposalsContext
): Promise<GetProposalsOutput> {
  const cacheKey = ctx.cache.generateKey('getProposals', input);
  const cached = ctx.cache.get<GetProposalsOutput>(cacheKey);
  if (cached) return cached;

  const proposals: Proposal[] = [];

  // Fetch from Snapshot
  try {
    const snapshotState = input.status === 'all' ? 'all'
      : input.status === 'active' ? 'active'
      : input.status === 'pending' ? 'pending'
      : 'closed';

    const snapshotProposals = await ctx.snapshotClient.getProposals(input.protocol, {
      limit: input.limit,
      state: snapshotState
    });

    for (const sp of snapshotProposals) {
      // Determine if passed or failed for closed proposals
      let status = mapSnapshotStatus(sp.state);
      if (sp.state === 'closed' && sp.scores.length >= 2) {
        const forVotes = sp.scores[0] || 0;
        const againstVotes = sp.scores[1] || 0;
        const passedQuorum = sp.quorum > 0 ? sp.scores_total >= sp.quorum : true;
        status = (forVotes > againstVotes && passedQuorum) ? 'Passed' : 'Failed';
      }

      // Filter by requested status
      if (input.status !== 'all') {
        const requestedStatus = input.status.charAt(0).toUpperCase() + input.status.slice(1);
        if (status !== requestedStatus && !(input.status === 'passed' && status === 'Executed')) {
          continue;
        }
      }

      proposals.push({
        id: sp.id,
        title: sp.title,
        type: 'off-chain',
        status,
        startTime: new Date(sp.start * 1000).toISOString(),
        endTime: new Date(sp.end * 1000).toISOString(),
        proposer: sp.author,
        forVotes: sp.scores[0] || 0,
        againstVotes: sp.scores[1] || 0,
        abstainVotes: sp.scores[2] || 0,
        quorumVotes: sp.quorum,
        descriptionUrl: sp.link,
        source: 'snapshot'
      });
    }
  } catch (error) {
    console.error('Snapshot fetch error:', error);
  }

  // Fetch from Tally
  try {
    const tallyProposals = await ctx.tallyClient.getProposals(input.protocol, {
      limit: input.limit
    });

    for (const tp of tallyProposals) {
      const status = mapTallyStatus(tp.status);

      // Filter by requested status
      if (input.status !== 'all') {
        const requestedStatus = input.status.charAt(0).toUpperCase() + input.status.slice(1);
        if (status !== requestedStatus && !(input.status === 'passed' && status === 'Executed')) {
          continue;
        }
      }

      // Extract vote counts
      let forVotes = 0, againstVotes = 0, abstainVotes = 0;
      for (const stat of tp.voteStats) {
        const weight = parseFloat(stat.weight) || 0;
        if (stat.support === 'FOR') forVotes = weight;
        else if (stat.support === 'AGAINST') againstVotes = weight;
        else if (stat.support === 'ABSTAIN') abstainVotes = weight;
      }

      proposals.push({
        id: tp.id,
        title: tp.title,
        type: 'on-chain',
        status,
        startTime: tp.createdAt,
        endTime: '', // Would need block time calculation
        proposer: tp.proposer.address,
        forVotes,
        againstVotes,
        abstainVotes,
        quorumVotes: parseFloat(tp.quorum) || undefined,
        source: 'tally'
      });
    }
  } catch (error) {
    console.error('Tally fetch error:', error);
  }

  // Sort by start time descending
  proposals.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // Apply limit
  const limitedProposals = proposals.slice(0, input.limit);

  const result: GetProposalsOutput = {
    proposals: limitedProposals,
    totalCount: limitedProposals.length,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'proposals');
  return result;
}

// Known protocol timelock delays (in seconds) - common governance configurations
const PROTOCOL_TIMELOCK_DELAYS: Record<string, number> = {
  'compound': 48 * 60 * 60,      // 48 hours
  'uniswap': 48 * 60 * 60,       // 48 hours (2-day timelock)
  'aave': 24 * 60 * 60,          // 24 hours (short executor)
  'ens': 48 * 60 * 60,           // 48 hours
  'gitcoin': 24 * 60 * 60,       // 24 hours
  'optimism': 24 * 60 * 60,      // 24 hours
  'arbitrum': 72 * 60 * 60,      // 72 hours (3-day timelock)
  'nouns': 48 * 60 * 60,         // 48 hours
  'hop': 48 * 60 * 60            // 48 hours
};

export async function handleGetProposalPipeline(
  input: GetProposalPipelineInput,
  ctx: ProposalsContext
): Promise<GetProposalPipelineOutput> {
  const cacheKey = ctx.cache.generateKey('getProposalPipeline', input);
  const cached = ctx.cache.get<GetProposalPipelineOutput>(cacheKey);
  if (cached) return cached;

  const pipelineProposals: PipelineProposal[] = [];
  const executionTimes: number[] = [];
  let successCount = 0;
  let totalCompleted = 0;

  // Fetch governance config for accurate timing estimates
  let votingPeriodSeconds = 7 * 24 * 60 * 60; // Default 7 days
  let protocolTimelockDelay = PROTOCOL_TIMELOCK_DELAYS[input.protocol.toLowerCase()] || 48 * 60 * 60;

  try {
    const governance = await ctx.tallyClient.getGovernance(input.protocol);
    if (governance) {
      // votingPeriod is in blocks; ~12 seconds per block on mainnet
      const blockTime = governance.chainId?.includes('10') || governance.chainId?.includes('42161') ? 2 : 12;
      if (governance.votingPeriod > 0) {
        votingPeriodSeconds = governance.votingPeriod * blockTime;
      }
    }
  } catch (error) {
    console.error('Failed to fetch governance config:', error);
  }

  // Fetch from Tally (on-chain proposals have execution pipeline)
  try {
    const tallyProposals = await ctx.tallyClient.getProposals(input.protocol, {
      limit: 50
    });

    for (const tp of tallyProposals) {
      const status = tp.status.toLowerCase();

      // Filter by status if specified
      if (input.status !== 'all' && !status.includes(input.status)) {
        continue;
      }

      const createdAt = tp.createdAt;
      let eta: string | undefined;
      let timelockDelay: number | undefined;

      // Calculate timelock delay for queued proposals using protocol config
      if (status.includes('queued') && tp.executableCalls && tp.executableCalls.length > 0) {
        timelockDelay = protocolTimelockDelay;
        eta = new Date(Date.now() + timelockDelay * 1000).toISOString();
      }

      // Track execution metrics using actual voting period
      if (status.includes('executed')) {
        successCount++;
        totalCompleted++;
        // Estimate total time: voting period + timelock
        executionTimes.push(votingPeriodSeconds + protocolTimelockDelay);
      } else if (status.includes('defeated') || status.includes('canceled')) {
        totalCompleted++;
      }

      pipelineProposals.push({
        id: tp.id,
        title: tp.title,
        status: tp.status,
        createdAt,
        eta,
        timelockDelay
      });
    }
  } catch (error) {
    console.error('Tally pipeline fetch error:', error);
  }

  // Add Snapshot proposals as off-chain items
  try {
    const snapshotProposals = await ctx.snapshotClient.getProposals(input.protocol, {
      limit: 20,
      state: input.status === 'active' ? 'active' : 'all'
    });

    for (const sp of snapshotProposals) {
      if (input.status !== 'all') {
        if (input.status === 'active' && sp.state !== 'active') continue;
        if (input.status === 'pending' && sp.state !== 'pending') continue;
      }

      pipelineProposals.push({
        id: sp.id,
        title: sp.title,
        status: `snapshot-${sp.state}`,
        createdAt: new Date(sp.start * 1000).toISOString()
      });
    }
  } catch (error) {
    console.error('Snapshot pipeline fetch error:', error);
  }

  const avgTimeToExecution = executionTimes.length > 0
    ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
    : 0;

  const executionSuccessRate = totalCompleted > 0
    ? (successCount / totalCompleted) * 100
    : 0;

  const pendingCount = pipelineProposals.filter(p =>
    p.status.includes('pending') || p.status.includes('active') || p.status.includes('queued')
  ).length;

  const result: GetProposalPipelineOutput = {
    proposals: pipelineProposals.slice(0, 50),
    avgTimeToExecution,
    executionSuccessRate,
    pendingCount,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'proposals');
  return result;
}

export async function handleGetProposalSuccessRate(
  input: GetProposalSuccessRateInput,
  ctx: ProposalsContext
): Promise<GetProposalSuccessRateOutput> {
  const cacheKey = ctx.cache.generateKey('getProposalSuccessRate', input);
  const cached = ctx.cache.get<GetProposalSuccessRateOutput>(cacheKey);
  if (cached) return cached;

  let totalProposals = 0;
  let passedProposals = 0;
  let executedProposals = 0;
  let failedProposals = 0;
  let canceledProposals = 0;
  let totalVoters = 0;
  let proposalCount = 0;

  // Get Tally proposals for on-chain stats
  try {
    const tallyProposals = await ctx.tallyClient.getProposals(input.protocol, {
      limit: 100
    });

    for (const tp of tallyProposals) {
      totalProposals++;
      const status = tp.status.toLowerCase();

      if (status.includes('executed')) {
        executedProposals++;
        passedProposals++;
      } else if (status.includes('succeeded') || status.includes('passed')) {
        passedProposals++;
      } else if (status.includes('defeated') || status.includes('failed')) {
        failedProposals++;
      } else if (status.includes('canceled') || status.includes('cancelled')) {
        canceledProposals++;
      }

      // Estimate voter turnout from vote stats
      const totalVotes = tp.voteStats.reduce((sum, v) => sum + parseInt(v.votes || '0'), 0);
      if (totalVotes > 0) {
        totalVoters += totalVotes;
        proposalCount++;
      }
    }
  } catch (error) {
    console.error('Tally success rate fetch error:', error);
  }

  // Get Snapshot proposals for off-chain stats
  try {
    const snapshotProposals = await ctx.snapshotClient.getProposals(input.protocol, {
      limit: 100,
      state: 'closed'
    });

    for (const sp of snapshotProposals) {
      totalProposals++;

      // Determine outcome
      if (sp.scores.length >= 2) {
        const forVotes = sp.scores[0] || 0;
        const againstVotes = sp.scores[1] || 0;
        const passedQuorum = sp.quorum > 0 ? sp.scores_total >= sp.quorum : true;

        if (forVotes > againstVotes && passedQuorum) {
          passedProposals++;
        } else {
          failedProposals++;
        }
      }

      totalVoters += sp.votes;
      proposalCount++;
    }
  } catch (error) {
    console.error('Snapshot success rate fetch error:', error);
  }

  const passingRate = totalProposals > 0
    ? (passedProposals / totalProposals) * 100
    : 0;

  const executionRate = passedProposals > 0
    ? (executedProposals / passedProposals) * 100
    : 0;

  const avgVoterTurnout = proposalCount > 0
    ? totalVoters / proposalCount
    : 0;

  const result: GetProposalSuccessRateOutput = {
    totalProposals,
    passedProposals,
    executedProposals,
    failedProposals,
    canceledProposals,
    passingRate,
    executionRate,
    avgVoterTurnout,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'proposals');
  return result;
}
