import { SnapshotClient } from '../clients/snapshot.js';
import { TallyClient } from '../clients/tally.js';
import { KarmaClient } from '../clients/karma.js';
import type { CacheManager } from '../utils/cache.js';
import type {
  GetVotingHistoryInput,
  GetVotingHistoryOutput,
  Vote,
  GetQuorumDataInput,
  GetQuorumDataOutput,
  QuorumProposal,
  GetVoterConcentrationInput,
  GetVoterConcentrationOutput
} from '../types/index.js';

interface VotingContext {
  cache: CacheManager;
  snapshotClient: SnapshotClient;
  tallyClient: TallyClient;
  karmaClient: KarmaClient;
}

function mapVoteSupport(choice: number | number[], choices: string[]): 'for' | 'against' | 'abstain' {
  if (Array.isArray(choice)) {
    // Ranked choice or multiple choice - take first
    choice = choice[0];
  }

  // Snapshot uses 1-indexed choices
  const choiceText = choices[choice - 1]?.toLowerCase() || '';

  if (choiceText.includes('for') || choiceText.includes('yes') || choiceText.includes('approve')) {
    return 'for';
  }
  if (choiceText.includes('against') || choiceText.includes('no') || choiceText.includes('reject')) {
    return 'against';
  }
  return 'abstain';
}

export async function handleGetVotingHistory(
  input: GetVotingHistoryInput,
  ctx: VotingContext
): Promise<GetVotingHistoryOutput> {
  const cacheKey = ctx.cache.generateKey('getVotingHistory', input);
  const cached = ctx.cache.get<GetVotingHistoryOutput>(cacheKey);
  if (cached) return cached;

  const votes: Vote[] = [];
  let totalVoteWeight = 0;

  // Fetch votes based on input parameters
  if (input.proposalId) {
    // Get votes for specific proposal from Snapshot
    try {
      // Fetch proposal to get choices for vote mapping
      const proposal = await ctx.snapshotClient.getProposal(input.proposalId);
      const choices = proposal?.choices || [];

      const snapshotVotes = await ctx.snapshotClient.getVotes(input.proposalId, {
        limit: input.limit
      });

      for (const sv of snapshotVotes) {
        votes.push({
          proposalId: sv.proposal.id,
          proposalTitle: sv.proposal.title,
          voterAddress: sv.voter,
          voteWeight: sv.vp,
          support: mapVoteSupport(sv.choice, choices),
          rationale: sv.reason || undefined,
          timestamp: new Date(sv.created * 1000).toISOString()
        });
        totalVoteWeight += sv.vp;
      }
    } catch (error) {
      console.error('Snapshot votes fetch error:', error);
    }

    // Also try Tally
    try {
      const tallyVotes = await ctx.tallyClient.getVotesForProposal(input.proposalId, {
        limit: input.limit
      });

      for (const tv of tallyVotes) {
        const support = tv.support.toLowerCase().includes('for') ? 'for'
          : tv.support.toLowerCase().includes('against') ? 'against'
          : 'abstain';

        votes.push({
          proposalId: input.proposalId,
          proposalTitle: '',
          voterAddress: tv.voter.address,
          voterEns: tv.voter.ens,
          voteWeight: parseFloat(tv.weight) || 0,
          support,
          rationale: tv.reason || undefined,
          timestamp: tv.createdAt
        });
        totalVoteWeight += parseFloat(tv.weight) || 0;
      }
    } catch (error) {
      console.error('Tally votes fetch error:', error);
    }
  } else if (input.delegateAddress) {
    // Get voting history for specific delegate
    try {
      const voterHistory = await ctx.snapshotClient.getVoterHistory(
        input.protocol,
        input.delegateAddress,
        { limit: input.limit }
      );

      // Cache proposal choices to avoid redundant fetches
      const proposalChoicesCache = new Map<string, string[]>();

      for (const sv of voterHistory) {
        // Fetch proposal choices if not cached
        let choices = proposalChoicesCache.get(sv.proposal.id);
        if (!choices) {
          const proposal = await ctx.snapshotClient.getProposal(sv.proposal.id);
          choices = proposal?.choices || [];
          proposalChoicesCache.set(sv.proposal.id, choices);
        }

        votes.push({
          proposalId: sv.proposal.id,
          proposalTitle: sv.proposal.title,
          voterAddress: sv.voter,
          voteWeight: sv.vp,
          support: mapVoteSupport(sv.choice, choices),
          rationale: sv.reason || undefined,
          timestamp: new Date(sv.created * 1000).toISOString()
        });
        totalVoteWeight += sv.vp;
      }
    } catch (error) {
      console.error('Snapshot voter history fetch error:', error);
    }
  } else {
    // Get recent votes across all proposals
    try {
      const proposals = await ctx.snapshotClient.getProposals(input.protocol, {
        limit: 5,
        state: 'closed'
      });

      for (const proposal of proposals) {
        const proposalVotes = await ctx.snapshotClient.getVotes(proposal.id, {
          limit: 20
        });

        for (const sv of proposalVotes) {
          votes.push({
            proposalId: proposal.id,
            proposalTitle: proposal.title,
            voterAddress: sv.voter,
            voteWeight: sv.vp,
            support: mapVoteSupport(sv.choice, proposal.choices),
            rationale: sv.reason || undefined,
            timestamp: new Date(sv.created * 1000).toISOString()
          });
          totalVoteWeight += sv.vp;
        }
      }
    } catch (error) {
      console.error('Snapshot recent votes fetch error:', error);
    }
  }

  // Sort by timestamp descending
  votes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const avgVoteWeight = votes.length > 0 ? totalVoteWeight / votes.length : 0;

  // Calculate participation rate using governance token supply
  let participationRate = 0;
  try {
    const governance = await ctx.tallyClient.getGovernance(input.protocol);
    if (governance?.token?.supply) {
      const totalSupply = parseFloat(governance.token.supply);
      if (totalSupply > 0) {
        participationRate = (totalVoteWeight / totalSupply) * 100;
      }
    }
  } catch (error) {
    console.error('Failed to fetch governance data for participation rate:', error);
  }

  const result: GetVotingHistoryOutput = {
    votes: votes.slice(0, input.limit),
    totalVotes: votes.length,
    participationRate,
    avgVoteWeight,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'voting');
  return result;
}

export async function handleGetQuorumData(
  input: GetQuorumDataInput,
  ctx: VotingContext
): Promise<GetQuorumDataOutput> {
  const cacheKey = ctx.cache.generateKey('getQuorumData', input);
  const cached = ctx.cache.get<GetQuorumDataOutput>(cacheKey);
  if (cached) return cached;

  const quorumProposals: QuorumProposal[] = [];
  let totalQuorumRequired = 0;
  let totalQuorumAchieved = 0;
  let quorumMetCount = 0;

  // Fetch from Snapshot
  try {
    const proposals = await ctx.snapshotClient.getProposals(input.protocol, {
      limit: 50,
      state: 'closed'
    });

    for (const p of proposals) {
      if (p.quorum > 0) {
        const achieved = p.scores_total;
        const passed = achieved >= p.quorum;

        quorumProposals.push({
          proposalId: p.id,
          title: p.title,
          quorumRequired: p.quorum,
          quorumAchieved: achieved,
          participation: p.votes,
          passed
        });

        totalQuorumRequired += p.quorum;
        totalQuorumAchieved += achieved;
        if (passed) quorumMetCount++;
      }
    }
  } catch (error) {
    console.error('Snapshot quorum fetch error:', error);
  }

  // Fetch from Tally
  try {
    const tallyProposals = await ctx.tallyClient.getProposals(input.protocol, {
      limit: 50
    });

    for (const tp of tallyProposals) {
      const quorumRequired = parseFloat(tp.quorum) || 0;
      if (quorumRequired > 0) {
        const totalVotes = tp.voteStats.reduce((sum, v) => sum + parseFloat(v.weight), 0);
        const passed = totalVotes >= quorumRequired;

        quorumProposals.push({
          proposalId: tp.id,
          title: tp.title,
          quorumRequired,
          quorumAchieved: totalVotes,
          participation: tp.voteStats.reduce((sum, v) => sum + parseInt(v.votes || '0'), 0),
          passed
        });

        totalQuorumRequired += quorumRequired;
        totalQuorumAchieved += totalVotes;
        if (passed) quorumMetCount++;
      }
    }
  } catch (error) {
    console.error('Tally quorum fetch error:', error);
  }

  const proposalCount = quorumProposals.length;
  const quorumRequirement = proposalCount > 0 ? totalQuorumRequired / proposalCount : 0;
  const avgQuorumAchieved = proposalCount > 0 ? totalQuorumAchieved / proposalCount : 0;
  const quorumRate = proposalCount > 0 ? (quorumMetCount / proposalCount) * 100 : 0;

  const result: GetQuorumDataOutput = {
    quorumRequirement,
    avgQuorumAchieved,
    quorumRate,
    proposals: quorumProposals.slice(0, 20),
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'voting');
  return result;
}

export async function handleGetVoterConcentration(
  input: GetVoterConcentrationInput,
  ctx: VotingContext
): Promise<GetVoterConcentrationOutput> {
  const cacheKey = ctx.cache.generateKey('getVoterConcentration', input);
  const cached = ctx.cache.get<GetVoterConcentrationOutput>(cacheKey);
  if (cached) return cached;

  // Fetch delegate voting power distribution
  const votingPowers: number[] = [];

  try {
    const karmaDelegates = await ctx.karmaClient.getDelegates(input.protocol, {
      limit: 200,
      field: 'delegatedVotes'
    });

    for (const kd of karmaDelegates) {
      const power = parseFloat(kd.delegatedVotes) || 0;
      if (power > 0) {
        votingPowers.push(power);
      }
    }
  } catch (error) {
    console.error('Karma concentration fetch error:', error);
  }

  // Fallback to Tally if Karma returns nothing
  if (votingPowers.length === 0) {
    try {
      const tallyDelegates = await ctx.tallyClient.getDelegates(input.protocol, {
        limit: 200
      });

      for (const td of tallyDelegates) {
        const power = parseFloat(td.votingPower.total) || 0;
        if (power > 0) {
          votingPowers.push(power);
        }
      }
    } catch (error) {
      console.error('Tally concentration fetch error:', error);
    }
  }

  // Sort descending
  votingPowers.sort((a, b) => b - a);

  const totalVotingPower = votingPowers.reduce((sum, p) => sum + p, 0);

  // Calculate concentration metrics
  let top10Power = 0;
  let top20Power = 0;
  let top50Power = 0;

  for (let i = 0; i < votingPowers.length; i++) {
    if (i < 10) top10Power += votingPowers[i];
    if (i < 20) top20Power += votingPowers[i];
    if (i < 50) top50Power += votingPowers[i];
  }

  const top10Percent = totalVotingPower > 0 ? (top10Power / totalVotingPower) * 100 : 0;
  const top20Percent = totalVotingPower > 0 ? (top20Power / totalVotingPower) * 100 : 0;
  const top50Percent = totalVotingPower > 0 ? (top50Power / totalVotingPower) * 100 : 0;

  // Calculate Nakamoto coefficient (minimum entities to reach 51%)
  let nakamotoCoefficient = 0;
  let cumulativePower = 0;
  for (const power of votingPowers) {
    cumulativePower += power;
    nakamotoCoefficient++;
    if (cumulativePower / totalVotingPower >= 0.51) {
      break;
    }
  }

  // Calculate Gini coefficient
  let giniNumerator = 0;
  const n = votingPowers.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      giniNumerator += Math.abs(votingPowers[i] - votingPowers[j]);
    }
  }
  const giniCoefficient = n > 0 && totalVotingPower > 0
    ? giniNumerator / (2 * n * totalVotingPower)
    : 0;

  // Determine concentration rating
  let concentrationRating: GetVoterConcentrationOutput['concentrationRating'];
  if (nakamotoCoefficient >= 20 && top10Percent < 50) {
    concentrationRating = 'Decentralized';
  } else if (nakamotoCoefficient >= 10 && top10Percent < 70) {
    concentrationRating = 'Moderate';
  } else if (nakamotoCoefficient >= 5 && top10Percent < 85) {
    concentrationRating = 'Concentrated';
  } else {
    concentrationRating = 'Plutocratic';
  }

  const result: GetVoterConcentrationOutput = {
    nakamotoCoefficient,
    top10Power: top10Percent,
    top20Power: top20Percent,
    top50Power: top50Percent,
    giniCoefficient,
    concentrationRating,
    totalVoters: votingPowers.length,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'concentration');
  return result;
}
