import type { CacheManager } from '../utils/cache.js';
import type { CompoundV3Client } from '../clients/compound-v3.js';
import type {
  CompoundHistoryInput,
  CompoundHistoryOutput,
  CompoundMarketSnapshot,
  CompoundRate
} from '../types/compound.js';
import { compoundRateToApy, calculateUtilization, timestampToIso } from '../utils/normalize.js';

interface CompoundHistoryContext {
  cache: CacheManager;
  compoundV3Client: CompoundV3Client;
}

function extractRate(rates: CompoundRate[], side: string): number {
  const rate = rates.find(r => r.side === side && r.type === 'VARIABLE');
  if (!rate) return 0;
  return compoundRateToApy(rate.rate);
}

function transformSnapshot(snapshot: CompoundMarketSnapshot) {
  const totalSupplyUsd = parseFloat(snapshot.totalDepositBalanceUSD || '0');
  const totalBorrowUsd = parseFloat(snapshot.totalBorrowBalanceUSD || '0');

  return {
    timestamp: timestampToIso(snapshot.timestamp),
    supplyApy: extractRate(snapshot.rates || [], 'LENDER'),
    borrowApy: extractRate(snapshot.rates || [], 'BORROWER'),
    utilization: calculateUtilization(totalBorrowUsd, totalSupplyUsd),
    totalSupplyUsd,
    totalBorrowUsd,
    dailyRevenueUsd: parseFloat(snapshot.dailyTotalRevenueUSD || '0')
  };
}

function calculateStatistics(history: Array<{
  supplyApy: number;
  borrowApy: number;
  utilization: number;
  totalSupplyUsd: number;
  dailyRevenueUsd: number;
}>) {
  if (history.length === 0) {
    return {
      avgSupplyApy: 0,
      avgBorrowApy: 0,
      avgUtilization: 0,
      tvlChange: 0,
      totalRevenue: 0
    };
  }

  const avgSupplyApy = history.reduce((sum, h) => sum + h.supplyApy, 0) / history.length;
  const avgBorrowApy = history.reduce((sum, h) => sum + h.borrowApy, 0) / history.length;
  const avgUtilization = history.reduce((sum, h) => sum + h.utilization, 0) / history.length;
  const totalRevenue = history.reduce((sum, h) => sum + h.dailyRevenueUsd, 0);

  const firstTvl = history[history.length - 1]?.totalSupplyUsd || 0;
  const lastTvl = history[0]?.totalSupplyUsd || 0;
  const tvlChange = firstTvl > 0 ? ((lastTvl - firstTvl) / firstTvl) * 100 : 0;

  return {
    avgSupplyApy,
    avgBorrowApy,
    avgUtilization,
    tvlChange,
    totalRevenue
  };
}

export async function handleCompoundHistory(
  input: CompoundHistoryInput,
  ctx: CompoundHistoryContext
): Promise<CompoundHistoryOutput> {
  const cacheKey = ctx.cache.generateKey('compoundHistory', {
    chain: input.chain,
    marketId: input.marketId,
    days: input.days
  });

  const cached = ctx.cache.get<CompoundHistoryOutput>(cacheKey);
  if (cached) {
    return cached;
  }

  ctx.compoundV3Client.setChain(input.chain as 'ethereum' | 'arbitrum' | 'polygon' | 'base');

  const market = await ctx.compoundV3Client.getMarketById(input.marketId);
  if (!market) {
    throw new Error(`Market not found: ${input.marketId}`);
  }

  const snapshots = await ctx.compoundV3Client.getMarketSnapshots(
    input.marketId,
    input.days
  );

  const cutoffTimestamp = Math.floor(Date.now() / 1000) - (input.days * 24 * 60 * 60);
  const filteredSnapshots = snapshots.filter(
    s => parseInt(s.timestamp, 10) >= cutoffTimestamp
  );

  const history = filteredSnapshots.map(transformSnapshot);
  const statistics = calculateStatistics(history);

  const result: CompoundHistoryOutput = {
    marketId: input.marketId,
    chain: input.chain,
    baseAsset: market.inputToken.symbol,
    history,
    statistics,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'compoundHistory');
  return result;
}
