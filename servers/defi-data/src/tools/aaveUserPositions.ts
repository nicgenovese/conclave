import type { CacheManager } from '../utils/cache.js';
import type { AaveV3Client } from '../clients/aave-v3.js';
import type {
  AaveUserPositionsInput,
  AaveUserPositionsOutput,
  AaveUserReserve
} from '../types/aave.js';
import { rayToApy, parseAmount } from '../utils/normalize.js';

interface AaveUserPositionsContext {
  cache: CacheManager;
  aaveV3Client: AaveV3Client;
}

function calculatePriceUsd(userReserve: AaveUserReserve): number {
  if (!userReserve.reserve.price?.priceInEth || !userReserve.reserve.price?.oracle?.usdPriceEth) {
    return 0;
  }
  const priceInEth = parseFloat(userReserve.reserve.price.priceInEth);
  const ethUsdPrice = parseFloat(userReserve.reserve.price.oracle.usdPriceEth);
  return priceInEth * ethUsdPrice;
}

function transformUserPosition(userReserve: AaveUserReserve) {
  const decimals = userReserve.reserve.decimals;
  const priceUsd = calculatePriceUsd(userReserve);

  const supplyBalance = parseAmount(userReserve.currentATokenBalance, decimals);
  const variableDebt = parseAmount(userReserve.currentVariableDebt, decimals);
  const stableDebt = parseAmount(userReserve.currentStableDebt, decimals);

  return {
    reserve: {
      symbol: userReserve.reserve.symbol,
      name: userReserve.reserve.name
    },
    supplyBalance: userReserve.currentATokenBalance,
    supplyBalanceUsd: supplyBalance * priceUsd,
    currentApy: rayToApy(userReserve.liquidityRate),
    variableDebt: userReserve.currentVariableDebt,
    variableDebtUsd: variableDebt * priceUsd,
    variableBorrowApy: rayToApy(userReserve.variableBorrowRate),
    stableDebt: userReserve.currentStableDebt,
    stableDebtUsd: stableDebt * priceUsd,
    stableBorrowApy: rayToApy(userReserve.stableBorrowRate),
    usedAsCollateral: userReserve.usageAsCollateralEnabledOnUser
  };
}

export async function handleAaveUserPositions(
  input: AaveUserPositionsInput,
  ctx: AaveUserPositionsContext
): Promise<AaveUserPositionsOutput> {
  const cacheKey = ctx.cache.generateKey('aaveUserPositions', {
    chain: input.chain,
    userAddress: input.userAddress.toLowerCase()
  });

  const cached = ctx.cache.get<AaveUserPositionsOutput>(cacheKey);
  if (cached) {
    return cached;
  }

  ctx.aaveV3Client.setChain(input.chain as 'ethereum' | 'arbitrum' | 'polygon' | 'optimism' | 'base');

  const response = await ctx.aaveV3Client.getUserPositions(input.userAddress);

  const positions = response.userReserves
    .filter(ur =>
      ur.currentATokenBalance !== '0' ||
      ur.currentVariableDebt !== '0' ||
      ur.currentStableDebt !== '0'
    )
    .map(transformUserPosition);

  const totalSuppliedUsd = positions.reduce((sum, p) => sum + p.supplyBalanceUsd, 0);
  const totalBorrowedUsd = positions.reduce(
    (sum, p) => sum + p.variableDebtUsd + p.stableDebtUsd,
    0
  );

  const result: AaveUserPositionsOutput = {
    userAddress: input.userAddress.toLowerCase(),
    chain: input.chain,
    positions,
    summary: {
      totalSuppliedUsd,
      totalBorrowedUsd,
      netWorthUsd: totalSuppliedUsd - totalBorrowedUsd,
      healthFactor: null,
      availableBorrowsUsd: 0
    },
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'aaveUserPositions');
  return result;
}
