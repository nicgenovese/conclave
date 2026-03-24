import type { CacheManager } from '../utils/cache.js';
import type { AaveV3Client } from '../clients/aave-v3.js';
import type {
  AaveReservesInput,
  AaveReservesOutput,
  AaveReserve
} from '../types/aave.js';
import {
  rayToApy,
  wadToPercent,
  parseAmount,
  bpsToPercent
} from '../utils/normalize.js';

interface AaveReservesContext {
  cache: CacheManager;
  aaveV3Client: AaveV3Client;
}

function calculatePriceUsd(reserve: AaveReserve): number {
  if (!reserve.price?.priceInEth || !reserve.price?.oracle?.usdPriceEth) {
    return 0;
  }
  const priceInEth = parseFloat(reserve.price.priceInEth);
  const ethUsdPrice = parseFloat(reserve.price.oracle.usdPriceEth);
  return priceInEth * ethUsdPrice;
}

function transformReserve(reserve: AaveReserve) {
  const priceUsd = calculatePriceUsd(reserve);
  const totalLiquidity = parseAmount(reserve.totalLiquidity, reserve.decimals);
  const availableLiquidity = parseAmount(reserve.availableLiquidity, reserve.decimals);

  return {
    id: reserve.id,
    symbol: reserve.symbol,
    name: reserve.name,
    decimals: reserve.decimals,
    underlyingAsset: reserve.underlyingAsset,
    totalLiquidity: reserve.totalLiquidity,
    totalLiquidityUsd: totalLiquidity * priceUsd,
    availableLiquidity: reserve.availableLiquidity,
    availableLiquidityUsd: availableLiquidity * priceUsd,
    supplyApy: rayToApy(reserve.liquidityRate),
    variableBorrowApy: rayToApy(reserve.variableBorrowRate),
    stableBorrowApy: reserve.stableBorrowRate !== '0' ? rayToApy(reserve.stableBorrowRate) : null,
    utilizationRate: wadToPercent(reserve.utilizationRate),
    totalVariableDebt: reserve.totalScaledVariableDebt,
    totalStableDebt: reserve.totalPrincipalStableDebt,
    ltv: bpsToPercent(reserve.baseLTVasCollateral),
    liquidationThreshold: bpsToPercent(reserve.reserveLiquidationThreshold),
    liquidationBonus: bpsToPercent(reserve.reserveLiquidationBonus) - 100,
    priceUsd
  };
}

export async function handleAaveReserves(
  input: AaveReservesInput,
  ctx: AaveReservesContext
): Promise<AaveReservesOutput> {
  const cacheKey = ctx.cache.generateKey('aaveReserves', {
    chain: input.chain,
    symbol: input.symbol || '',
    minLiquidity: input.minLiquidity || 0
  });

  const cached = ctx.cache.get<AaveReservesOutput>(cacheKey);
  if (cached) {
    return cached;
  }

  ctx.aaveV3Client.setChain(input.chain as 'ethereum' | 'arbitrum' | 'polygon' | 'optimism' | 'base');

  let reserves: AaveReserve[];

  if (input.symbol) {
    const reserve = await ctx.aaveV3Client.getReserveBySymbol(input.symbol);
    reserves = reserve ? [reserve] : [];
  } else {
    reserves = await ctx.aaveV3Client.getReserves();
  }

  let transformedReserves = reserves.map(transformReserve);

  if (input.minLiquidity) {
    transformedReserves = transformedReserves.filter(
      r => r.availableLiquidityUsd >= input.minLiquidity!
    );
  }

  const totalTvlUsd = transformedReserves.reduce((sum, r) => sum + r.totalLiquidityUsd, 0);

  let weightedAvgSupplyApy = 0;
  let weightedAvgBorrowApy = 0;

  if (totalTvlUsd > 0) {
    weightedAvgSupplyApy = transformedReserves.reduce(
      (sum, r) => sum + (r.supplyApy * r.totalLiquidityUsd / totalTvlUsd),
      0
    );
    weightedAvgBorrowApy = transformedReserves.reduce(
      (sum, r) => sum + (r.variableBorrowApy * r.totalLiquidityUsd / totalTvlUsd),
      0
    );
  }

  const result: AaveReservesOutput = {
    chain: input.chain,
    reserves: transformedReserves,
    aggregateMetrics: {
      totalTvlUsd,
      weightedAvgSupplyApy,
      weightedAvgBorrowApy
    },
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'aaveReserves');
  return result;
}
