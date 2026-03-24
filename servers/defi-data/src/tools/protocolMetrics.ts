import type { CacheManager } from '../utils/cache.js';
import type { DefiLlamaClient } from '../clients/defillama.js';
import type { ProtocolMetricsInput, ProtocolMetricsOutput } from '../types/index.js';

interface ProtocolMetricsContext {
  cache: CacheManager;
  defiLlamaClient: DefiLlamaClient;
}

function determineLiquidityHealth(tvl: number): 'Deep' | 'Adequate' | 'Shallow' | 'Critical' {
  if (tvl >= 1_000_000_000) return 'Deep';        // $1B+
  if (tvl >= 100_000_000) return 'Adequate';      // $100M+
  if (tvl >= 10_000_000) return 'Shallow';        // $10M+
  return 'Critical';                               // < $10M
}

export async function handleProtocolMetrics(
  input: ProtocolMetricsInput,
  ctx: ProtocolMetricsContext
): Promise<ProtocolMetricsOutput> {
  // Check cache first
  const cacheKey = ctx.cache.generateKey('protocolMetrics', { protocol: input.protocol });
  const cached = ctx.cache.get<ProtocolMetricsOutput>(cacheKey);
  if (cached) return cached;

  // Fetch from DefiLlama
  const protocolData = await ctx.defiLlamaClient.getProtocol(input.protocol);

  // Calculate TVL changes from historical data
  const tvlHistory = protocolData.tvl || [];
  const currentTvl = tvlHistory.length > 0
    ? tvlHistory[tvlHistory.length - 1].totalLiquidityUSD
    : 0;

  // Get TVL from different time points
  const now = Date.now() / 1000;
  const oneDayAgo = now - 86400;
  const sevenDaysAgo = now - 86400 * 7;
  const thirtyDaysAgo = now - 86400 * 30;

  const findTvlAtTime = (targetTime: number): number => {
    for (let i = tvlHistory.length - 1; i >= 0; i--) {
      if (tvlHistory[i].date <= targetTime) {
        return tvlHistory[i].totalLiquidityUSD;
      }
    }
    return tvlHistory.length > 0 ? tvlHistory[0].totalLiquidityUSD : 0;
  };

  const tvl1dAgo = findTvlAtTime(oneDayAgo);
  const tvl7dAgo = findTvlAtTime(sevenDaysAgo);
  const tvl30dAgo = findTvlAtTime(thirtyDaysAgo);

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Build chain distribution
  const chainTvls = protocolData.currentChainTvls || {};
  const totalChainTvl = Object.values(chainTvls).reduce((sum, val) => sum + val, 0);
  const chainDistribution = Object.entries(chainTvls)
    .map(([chain, tvl]) => ({
      chain,
      tvlUsd: tvl,
      percentOfTotal: totalChainTvl > 0 ? (tvl / totalChainTvl) * 100 : 0
    }))
    .sort((a, b) => b.tvlUsd - a.tvlUsd)
    .slice(0, 10); // Top 10 chains

  // Build historical TVL (last 30 data points)
  const recentTvlHistory = tvlHistory
    .slice(-30)
    .map(entry => ({
      date: new Date(entry.date * 1000).toISOString().split('T')[0],
      tvlUsd: entry.totalLiquidityUSD
    }));

  const result: ProtocolMetricsOutput = {
    protocol: protocolData.slug,
    protocolName: protocolData.name,
    category: protocolData.category || 'Unknown',
    currentTvlUsd: currentTvl,
    tvlChange: {
      change24h: calculateChange(currentTvl, tvl1dAgo),
      change7d: calculateChange(currentTvl, tvl7dAgo),
      change30d: calculateChange(currentTvl, tvl30dAgo)
    },
    chainDistribution,
    historicalTvl: recentTvlHistory,
    liquidityHealth: determineLiquidityHealth(currentTvl),
    dataFreshness: new Date().toISOString()
  };

  // Cache the result
  ctx.cache.set(cacheKey, result, 'protocolMetrics');

  return result;
}
