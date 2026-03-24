import type { CacheManager } from '../utils/cache.js';
import type { CompoundV3Client } from '../clients/compound-v3.js';
import type {
  CompoundAccountInput,
  CompoundAccountOutput,
  CompoundAccount,
  CompoundPosition
} from '../types/compound.js';
import { parseAmount } from '../utils/normalize.js';

interface CompoundAccountsContext {
  cache: CacheManager;
  compoundV3Client: CompoundV3Client;
}

function transformPosition(position: CompoundPosition) {
  const decimals = position.asset.decimals;
  const priceUsd = parseFloat(position.asset.lastPriceUSD || '0');
  const balance = parseAmount(position.balance, decimals);
  const balanceUsd = balance * priceUsd;

  return {
    market: {
      id: position.market.id,
      baseAsset: position.market.inputToken.symbol
    },
    asset: position.asset.symbol,
    balance: position.balance,
    balanceUsd: Math.abs(balanceUsd),
    side: position.side === 'LENDER' ? 'supply' as const : 'borrow' as const,
    isCollateral: position.isCollateral
  };
}

export async function handleCompoundAccount(
  input: CompoundAccountInput,
  ctx: CompoundAccountsContext
): Promise<CompoundAccountOutput> {
  const cacheKey = ctx.cache.generateKey('compoundAccount', {
    chain: input.chain,
    accountAddress: input.accountAddress.toLowerCase(),
    marketId: input.marketId || ''
  });

  const cached = ctx.cache.get<CompoundAccountOutput>(cacheKey);
  if (cached) {
    return cached;
  }

  ctx.compoundV3Client.setChain(input.chain as 'ethereum' | 'arbitrum' | 'polygon' | 'base');

  const accounts = await ctx.compoundV3Client.getAccountPositions(input.accountAddress);

  let allPositions: CompoundPosition[] = [];
  let totalLiquidationCount = 0;
  let totalPositionCount = 0;

  for (const account of accounts) {
    if (input.marketId) {
      const filtered = account.positions.filter(
        p => p.market.id.toLowerCase() === input.marketId!.toLowerCase()
      );
      allPositions = allPositions.concat(filtered);
    } else {
      allPositions = allPositions.concat(account.positions);
    }
    totalLiquidationCount += account.liquidationCount;
    totalPositionCount += account.positionCount;
  }

  const positions = allPositions.map(transformPosition);

  const totalSuppliedUsd = positions
    .filter(p => p.side === 'supply')
    .reduce((sum, p) => sum + p.balanceUsd, 0);

  const totalBorrowedUsd = positions
    .filter(p => p.side === 'borrow')
    .reduce((sum, p) => sum + p.balanceUsd, 0);

  const totalCollateralUsd = positions
    .filter(p => p.isCollateral)
    .reduce((sum, p) => sum + p.balanceUsd, 0);

  const result: CompoundAccountOutput = {
    accountAddress: input.accountAddress.toLowerCase(),
    chain: input.chain,
    positions,
    summary: {
      totalSuppliedUsd,
      totalBorrowedUsd,
      totalCollateralUsd,
      netPositionUsd: totalSuppliedUsd - totalBorrowedUsd,
      positionCount: totalPositionCount,
      liquidationCount: totalLiquidationCount
    },
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'compoundAccount');
  return result;
}
