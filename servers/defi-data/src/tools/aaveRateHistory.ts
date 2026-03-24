import type { CacheManager } from '../utils/cache.js';
import type { AaveV3Client } from '../clients/aave-v3.js';
import type {
  AaveRateHistoryInput,
  AaveRateHistoryOutput,
  AaveRateSnapshot
} from '../types/aave.js';
import { rayToApy, wadToPercent, timestampToIso } from '../utils/normalize.js';

interface AaveRateHistoryContext {
  cache: CacheManager;
  aaveV3Client: AaveV3Client;
}

function transformSnapshot(snapshot: AaveRateSnapshot, ethPrice: number = 1) {
  return {
    timestamp: timestampToIso(snapshot.timestamp),
    supplyApy: rayToApy(snapshot.liquidityRate),
    variableBorrowApy: rayToApy(snapshot.variableBorrowRate),
    stableBorrowApy: snapshot.stableBorrowRate !== '0'
      ? rayToApy(snapshot.stableBorrowRate)
      : null,
    utilizationRate: wadToPercent(snapshot.utilizationRate),
    totalLiquidityUsd: parseFloat(snapshot.totalLiquidity) * ethPrice
  };
}

function calculateStatistics(history: Array<{ supplyApy: number; variableBorrowApy: number }>) {
  if (history.length === 0) {
    return {
      avgSupplyApy: 0,
      avgBorrowApy: 0,
      maxSupplyApy: 0,
      minSupplyApy: 0,
      volatility: 0
    };
  }

  const supplyApys = history.map(h => h.supplyApy);
  const borrowApys = history.map(h => h.variableBorrowApy);

  const avgSupplyApy = supplyApys.reduce((a, b) => a + b, 0) / supplyApys.length;
  const avgBorrowApy = borrowApys.reduce((a, b) => a + b, 0) / borrowApys.length;
  const maxSupplyApy = Math.max(...supplyApys);
  const minSupplyApy = Math.min(...supplyApys);

  const variance = supplyApys.reduce((sum, apy) => sum + Math.pow(apy - avgSupplyApy, 2), 0) / supplyApys.length;
  const volatility = Math.sqrt(variance);

  return {
    avgSupplyApy,
    avgBorrowApy,
    maxSupplyApy,
    minSupplyApy,
    volatility
  };
}

export async function handleAaveRateHistory(
  input: AaveRateHistoryInput,
  ctx: AaveRateHistoryContext
): Promise<AaveRateHistoryOutput> {
  const cacheKey = ctx.cache.generateKey('aaveRateHistory', {
    chain: input.chain,
    symbol: input.symbol,
    days: input.days
  });

  const cached = ctx.cache.get<AaveRateHistoryOutput>(cacheKey);
  if (cached) {
    return cached;
  }

  ctx.aaveV3Client.setChain(input.chain as 'ethereum' | 'arbitrum' | 'polygon' | 'optimism' | 'base');

  const reserve = await ctx.aaveV3Client.getReserveBySymbol(input.symbol);
  if (!reserve) {
    throw new Error(`Reserve not found for symbol: ${input.symbol}`);
  }

  const snapshotsPerDay = 4;
  const snapshots = await ctx.aaveV3Client.getRateHistory(
    reserve.id,
    input.days * snapshotsPerDay
  );

  const cutoffTimestamp = Math.floor(Date.now() / 1000) - (input.days * 24 * 60 * 60);
  const filteredSnapshots = snapshots.filter(
    s => parseInt(s.timestamp, 10) >= cutoffTimestamp
  );

  const history = filteredSnapshots.map(s => transformSnapshot(s));
  const statistics = calculateStatistics(history);

  const result: AaveRateHistoryOutput = {
    symbol: input.symbol,
    chain: input.chain,
    reserveId: reserve.id,
    history,
    statistics,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'aaveRateHistory');
  return result;
}
