import { DefiLlamaClient } from '../clients/defillama.js';
import { CacheManager } from '../utils/cache.js';
import type { TvlHistoryInput, TvlHistoryOutput } from '../types/index.js';

interface ToolContext {
  cache: CacheManager;
  defiLlamaClient: DefiLlamaClient;
}

export async function handleTvlHistory(
  input: TvlHistoryInput,
  ctx: ToolContext
): Promise<TvlHistoryOutput> {
  const cacheKey = ctx.cache.generateKey('tvlHistory', input);
  const cached = ctx.cache.get<TvlHistoryOutput>(cacheKey);
  if (cached) return cached;

  const protocol = await ctx.defiLlamaClient.getProtocol(input.protocol);
  const tvlHistory = await ctx.defiLlamaClient.getTvlHistory(input.protocol);

  // Calculate period-based history
  const periodDays = getPeriodDays(input.period);
  const now = Date.now() / 1000;
  const cutoffTimestamp = now - periodDays * 86400;

  const filteredHistory = tvlHistory
    .filter(entry => entry.date >= cutoffTimestamp)
    .map(entry => ({
      date: new Date(entry.date * 1000).toISOString().split('T')[0],
      tvlUsd: entry.totalLiquidityUSD
    }));

  // Calculate changes
  const tvlChange = calculateTvlChanges(tvlHistory, protocol.tvl);

  // Calculate chain distribution
  const chainDistribution = Object.entries(protocol.chainTvls || {})
    .map(([chain, tvl]) => ({
      chain,
      tvlUsd: tvl,
      percentOfTotal: protocol.tvl > 0 ? (tvl / protocol.tvl) * 100 : 0
    }))
    .sort((a, b) => b.tvlUsd - a.tvlUsd);

  // Determine liquidity health
  const liquidityHealth = getLiquidityHealth(protocol.tvl);

  const result: TvlHistoryOutput = {
    protocol: input.protocol,
    protocolName: protocol.name,
    currentTvlUsd: protocol.tvl,
    tvlChange,
    chainDistribution,
    historicalTvl: filteredHistory,
    liquidityHealth,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'tvlHistory');
  return result;
}

function getPeriodDays(period: string): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    default: return 30;
  }
}

function calculateTvlChanges(
  history: { date: number; totalLiquidityUSD: number }[],
  currentTvl: number
): TvlHistoryOutput['tvlChange'] {
  const now = Date.now() / 1000;

  const getTvlAtDaysAgo = (days: number): number | null => {
    const targetTime = now - days * 86400;
    const closest = history
      .filter(h => h.date <= targetTime)
      .sort((a, b) => b.date - a.date)[0];
    return closest?.totalLiquidityUSD ?? null;
  };

  const tvl7dAgo = getTvlAtDaysAgo(7);
  const tvl30dAgo = getTvlAtDaysAgo(30);
  const tvl90dAgo = getTvlAtDaysAgo(90);

  const calcChange = (oldTvl: number | null): number => {
    if (!oldTvl || oldTvl === 0) return 0;
    return ((currentTvl - oldTvl) / oldTvl) * 100;
  };

  return {
    change7d: tvl7dAgo !== null ? calcChange(tvl7dAgo) : 0,
    change30d: tvl30dAgo !== null ? calcChange(tvl30dAgo) : 0,
    change90d: tvl90dAgo !== null ? calcChange(tvl90dAgo) : null
  };
}

function getLiquidityHealth(tvl: number): TvlHistoryOutput['liquidityHealth'] {
  if (tvl >= 1_000_000_000) return 'Deep';       // $1B+
  if (tvl >= 100_000_000) return 'Adequate';     // $100M+
  if (tvl >= 10_000_000) return 'Shallow';       // $10M+
  return 'Critical';                              // <$10M
}
