import { SnapshotClient } from '../clients/snapshot.js';
import { TallyClient } from '../clients/tally.js';
import { KarmaClient } from '../clients/karma.js';
import type { CacheManager } from '../utils/cache.js';
import type {
  GetDelegatesInput,
  GetDelegatesOutput,
  Delegate,
  GetDelegationGraphInput,
  GetDelegationGraphOutput,
  DelegationEdge
} from '../types/index.js';

interface DelegatesContext {
  cache: CacheManager;
  snapshotClient: SnapshotClient;
  tallyClient: TallyClient;
  karmaClient: KarmaClient;
}

export async function handleGetDelegates(
  input: GetDelegatesInput,
  ctx: DelegatesContext
): Promise<GetDelegatesOutput> {
  const cacheKey = ctx.cache.generateKey('getDelegates', input);
  const cached = ctx.cache.get<GetDelegatesOutput>(cacheKey);
  if (cached) return cached;

  const delegateMap = new Map<string, Delegate>();
  let totalVotingPower = 0;

  // Fetch from Karma first (most comprehensive delegate data)
  try {
    const karmaDelegates = await ctx.karmaClient.getDelegates(input.protocol, {
      limit: input.limit,
      field: input.sortBy === 'delegateCount' ? 'delegatorCount'
        : input.sortBy === 'proposalCount' ? 'karmaScore'
        : 'delegatedVotes'
    });

    for (const kd of karmaDelegates) {
      const votingPower = parseFloat(kd.delegatedVotes) || 0;
      totalVotingPower += votingPower;

      delegateMap.set(kd.address.toLowerCase(), {
        address: kd.address,
        ensName: kd.ensName,
        votingPower,
        votingPowerPercent: 0, // Calculate after we have total
        delegatorCount: kd.delegatorCount,
        proposalsCreated: 0, // Karma doesn't provide this directly
        votesParticipated: 0,
        participationRate: (kd.onChainVotesPct + kd.offChainVotesPct) / 2,
        lastActiveDate: kd.lastVoteTimestamp,
        statement: undefined,
        isTeamMember: kd.status === 'recognized'
      });
    }
  } catch (error) {
    console.error('Karma delegates fetch error:', error);
  }

  // Enrich with Tally data
  try {
    const tallyDelegates = await ctx.tallyClient.getDelegates(input.protocol, {
      limit: input.limit
    });

    for (const td of tallyDelegates) {
      const addr = td.address.toLowerCase();
      const votingPower = parseFloat(td.votingPower.total) || 0;

      if (delegateMap.has(addr)) {
        // Update existing delegate with Tally data
        const existing = delegateMap.get(addr)!;
        existing.proposalsCreated = td.proposalsCreated;
        existing.votesParticipated = td.votesCount;
        existing.participationRate = td.participationRate * 100;
        existing.statement = td.statement?.statement;
      } else {
        totalVotingPower += votingPower;
        delegateMap.set(addr, {
          address: td.address,
          ensName: td.ens,
          votingPower,
          votingPowerPercent: 0,
          delegatorCount: td.delegatorsCount,
          proposalsCreated: td.proposalsCreated,
          votesParticipated: td.votesCount,
          participationRate: td.participationRate * 100,
          statement: td.statement?.statement
        });
      }
    }
  } catch (error) {
    console.error('Tally delegates fetch error:', error);
  }

  // Calculate voting power percentages
  const delegates = Array.from(delegateMap.values()).map(d => ({
    ...d,
    votingPowerPercent: totalVotingPower > 0 ? (d.votingPower / totalVotingPower) * 100 : 0
  }));

  // Sort by requested field
  delegates.sort((a, b) => {
    switch (input.sortBy) {
      case 'delegateCount':
        return b.delegatorCount - a.delegatorCount;
      case 'proposalCount':
        return b.proposalsCreated - a.proposalsCreated;
      case 'participationRate':
        return b.participationRate - a.participationRate;
      default:
        return b.votingPower - a.votingPower;
    }
  });

  const result: GetDelegatesOutput = {
    delegates: delegates.slice(0, input.limit),
    totalDelegates: delegates.length,
    totalVotingPower,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'delegates');
  return result;
}

export async function handleGetDelegationGraph(
  input: GetDelegationGraphInput,
  ctx: DelegatesContext
): Promise<GetDelegationGraphOutput> {
  const cacheKey = ctx.cache.generateKey('getDelegationGraph', input);
  const cached = ctx.cache.get<GetDelegationGraphOutput>(cacheKey);
  if (cached) return cached;

  const edges: DelegationEdge[] = [];
  const visited = new Set<string>();
  const circularDelegations: string[][] = [];

  // Build delegation graph from Snapshot
  try {
    const delegations = await ctx.snapshotClient.getDelegates(input.protocol, {
      limit: 500
    });

    // Build adjacency map
    const delegationMap = new Map<string, string>();
    for (const d of delegations) {
      delegationMap.set(d.delegator.toLowerCase(), d.delegate.toLowerCase());
    }

    // If specific delegate requested, trace their delegation chain
    if (input.delegateAddress) {
      const startAddr = input.delegateAddress.toLowerCase();
      const chain: string[] = [startAddr];
      let current = startAddr;
      let depth = 0;

      while (depth < input.depth) {
        const delegateTo = delegationMap.get(current);
        if (!delegateTo || chain.includes(delegateTo)) {
          if (delegateTo && chain.includes(delegateTo)) {
            // Circular delegation detected
            const circularStart = chain.indexOf(delegateTo);
            circularDelegations.push(chain.slice(circularStart));
          }
          break;
        }

        edges.push({
          from: current,
          to: delegateTo,
          power: 0, // Would need to fetch voting power
          depth: depth + 1
        });

        chain.push(delegateTo);
        current = delegateTo;
        depth++;
      }

      // Also find who delegates TO this address
      for (const [from, to] of delegationMap.entries()) {
        if (to === startAddr && !visited.has(from)) {
          visited.add(from);
          edges.push({
            from,
            to: startAddr,
            power: 0,
            depth: 1
          });
        }
      }
    } else {
      // Build full graph up to depth
      for (const [from, to] of delegationMap.entries()) {
        edges.push({
          from,
          to,
          power: 0,
          depth: 1
        });

        // Check for circular delegations
        const chain = [from, to];
        let current = to;
        for (let d = 1; d < input.depth; d++) {
          const next = delegationMap.get(current);
          if (!next) break;
          if (chain.includes(next)) {
            const circularStart = chain.indexOf(next);
            circularDelegations.push(chain.slice(circularStart));
            break;
          }
          chain.push(next);
          current = next;
        }
      }
    }
  } catch (error) {
    console.error('Delegation graph fetch error:', error);
  }

  // Enrich with Tally delegation info if specific address
  if (input.delegateAddress) {
    try {
      const tallyInfo = await ctx.tallyClient.getDelegationInfo(
        input.protocol,
        input.delegateAddress
      );

      if (tallyInfo) {
        if (tallyInfo.delegatingTo) {
          const existing = edges.find(e =>
            e.from === input.delegateAddress!.toLowerCase() &&
            e.to === tallyInfo.delegatingTo!.toLowerCase()
          );
          if (!existing) {
            edges.push({
              from: input.delegateAddress.toLowerCase(),
              to: tallyInfo.delegatingTo.toLowerCase(),
              power: 0,
              depth: 1
            });
          }
        }

        for (const delegator of tallyInfo.delegatedFrom) {
          const existing = edges.find(e =>
            e.from === delegator.address.toLowerCase() &&
            e.to === input.delegateAddress!.toLowerCase()
          );
          if (!existing) {
            edges.push({
              from: delegator.address.toLowerCase(),
              to: input.delegateAddress.toLowerCase(),
              power: parseFloat(delegator.votingPower) || 0,
              depth: 1
            });
          }
        }
      }
    } catch (error) {
      console.error('Tally delegation info fetch error:', error);
    }
  }

  // Calculate metrics
  const uniqueDelegators = new Set(edges.map(e => e.from));
  const uniqueDelegates = new Set(edges.map(e => e.to));
  const isolatedDelegates = uniqueDelegates.size - uniqueDelegators.size;

  const totalNodes = new Set([...uniqueDelegators, ...uniqueDelegates]).size;
  const delegationDensity = totalNodes > 1
    ? edges.length / (totalNodes * (totalNodes - 1))
    : 0;

  const maxDepth = edges.reduce((max, e) => Math.max(max, e.depth), 0);

  const result: GetDelegationGraphOutput = {
    delegationEdges: edges.slice(0, 500), // Limit output size
    circularDelegations: circularDelegations.slice(0, 10),
    isolatedDelegates: Math.max(0, isolatedDelegates),
    delegationDensity,
    maxDelegationDepth: maxDepth,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'delegates');
  return result;
}
