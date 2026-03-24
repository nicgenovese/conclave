import type { CacheManager } from '../utils/cache.js';
import type { CompoundV3Client } from '../clients/compound-v3.js';
import type {
  CompoundMarketsInput,
  CompoundMarketsOutput,
  CompoundMarket,
  CompoundRate
} from '../types/compound.js';
import { compoundRateToApy, calculateUtilization } from '../utils/normalize.js';

interface CompoundMarketsContext {
  cache: CacheManager;
  compoundV3Client: CompoundV3Client;
}

function extractRate(rates: CompoundRate[], side: string): number {
  const rate = rates.find(r => r.side === side && r.type === 'VARIABLE');
  if (!rate) return 0;
  return compoundRateToApy(rate.rate);
}

function transformMarket(market: CompoundMarket) {
  const totalSupplyUsd = parseFloat(market.totalDepositBalanceUSD || '0');
  const totalBorrowUsd = parseFloat(market.totalBorrowBalanceUSD || '0');
  const tvlUsd = parseFloat(market.totalValueLockedUSD || '0');

  const supplyApy = extractRate(market.rates || [], 'LENDER');
  const borrowApy = extractRate(market.rates || [], 'BORROWER');
  const utilization = calculateUtilization(totalBorrowUsd, totalSupplyUsd);

  const rewardTokens = (market.rewardTokens || [])
    .map(rt => rt.token.symbol)
    .filter(Boolean);

  return {
    id: market.id,
    cometProxy: market.cometProxy || market.id,
    baseAsset: {
      symbol: market.inputToken.symbol,
      name: market.inputToken.name,
      decimals: market.inputToken.decimals
    },
    totalSupplyUsd,
    totalBorrowUsd,
    tvlUsd,
    supplyApy,
    borrowApy,
    utilization,
    rewardTokens
  };
}

export async function handleCompoundMarkets(
  input: CompoundMarketsInput,
  ctx: CompoundMarketsContext
): Promise<CompoundMarketsOutput> {
  const cacheKey = ctx.cache.generateKey('compoundMarkets', {
    chain: input.chain,
    marketId: input.marketId || ''
  });

  const cached = ctx.cache.get<CompoundMarketsOutput>(cacheKey);
  if (cached) {
    return cached;
  }

  ctx.compoundV3Client.setChain(input.chain as 'ethereum' | 'arbitrum' | 'polygon' | 'base');

  let markets: CompoundMarket[];

  if (input.marketId) {
    const market = await ctx.compoundV3Client.getMarketById(input.marketId);
    markets = market ? [market] : [];
  } else {
    markets = await ctx.compoundV3Client.getMarkets();
  }

  const transformedMarkets = markets.map(transformMarket);

  const totalTvlUsd = transformedMarkets.reduce((sum, m) => sum + m.tvlUsd, 0);
  const totalSupplyUsd = transformedMarkets.reduce((sum, m) => sum + m.totalSupplyUsd, 0);
  const totalBorrowUsd = transformedMarkets.reduce((sum, m) => sum + m.totalBorrowUsd, 0);

  const result: CompoundMarketsOutput = {
    chain: input.chain,
    markets: transformedMarkets,
    aggregateMetrics: {
      totalTvlUsd,
      totalSupplyUsd,
      totalBorrowUsd
    },
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'compoundMarkets');
  return result;
}
