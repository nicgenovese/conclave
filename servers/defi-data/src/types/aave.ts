import { z } from 'zod';

// ========== Input Schemas ==========

export const AaveReservesInputSchema = z.object({
  chain: z.enum(['ethereum', 'arbitrum', 'polygon', 'optimism', 'base']).default('ethereum'),
  symbol: z.string().optional().describe('Filter by asset symbol (e.g., "WETH", "USDC")'),
  minLiquidity: z.number().optional().describe('Minimum available liquidity in USD')
});
export type AaveReservesInput = z.infer<typeof AaveReservesInputSchema>;

export const AaveUserPositionsInputSchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chain: z.enum(['ethereum', 'arbitrum', 'polygon', 'optimism', 'base']).default('ethereum')
});
export type AaveUserPositionsInput = z.infer<typeof AaveUserPositionsInputSchema>;

export const AaveRateHistoryInputSchema = z.object({
  symbol: z.string().min(1, 'Asset symbol required (e.g., "WETH")'),
  chain: z.enum(['ethereum', 'arbitrum', 'polygon', 'optimism', 'base']).default('ethereum'),
  days: z.number().min(1).max(365).default(30)
});
export type AaveRateHistoryInput = z.infer<typeof AaveRateHistoryInputSchema>;

// ========== Subgraph Response Types ==========

export interface AaveReservePrice {
  priceInEth: string;
  oracle?: {
    usdPriceEth: string;
  };
}

export interface AaveReserve {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  underlyingAsset: string;
  totalLiquidity: string;
  availableLiquidity: string;
  totalScaledVariableDebt: string;
  totalPrincipalStableDebt: string;
  liquidityRate: string;
  variableBorrowRate: string;
  stableBorrowRate: string;
  utilizationRate: string;
  baseLTVasCollateral: number;
  reserveLiquidationThreshold: number;
  reserveLiquidationBonus: number;
  price: AaveReservePrice;
  aToken?: { id: string };
}

export interface AaveUserReserve {
  id: string;
  reserve: {
    symbol: string;
    name: string;
    decimals: number;
    price: AaveReservePrice;
  };
  currentATokenBalance: string;
  scaledATokenBalance: string;
  currentVariableDebt: string;
  scaledVariableDebt: string;
  currentStableDebt: string;
  principalStableDebt: string;
  usageAsCollateralEnabledOnUser: boolean;
  liquidityRate: string;
  variableBorrowRate: string;
  stableBorrowRate: string;
}

export interface AaveRateSnapshot {
  id: string;
  timestamp: string;
  liquidityRate: string;
  variableBorrowRate: string;
  stableBorrowRate: string;
  utilizationRate: string;
  totalLiquidity: string;
  availableLiquidity: string;
}

export interface AaveReservesResponse {
  reserves: AaveReserve[];
}

export interface AaveUserPositionsResponse {
  userReserves: AaveUserReserve[];
  user?: {
    id: string;
    borrowedReservesCount: number;
    lifetimeRewards: string;
  };
}

export interface AaveRateHistoryResponse {
  reserveParamsHistoryItems: AaveRateSnapshot[];
}

// ========== Output Types ==========

export interface AaveReservesOutput {
  chain: string;
  reserves: Array<{
    id: string;
    symbol: string;
    name: string;
    decimals: number;
    underlyingAsset: string;
    totalLiquidity: string;
    totalLiquidityUsd: number;
    availableLiquidity: string;
    availableLiquidityUsd: number;
    supplyApy: number;
    variableBorrowApy: number;
    stableBorrowApy: number | null;
    utilizationRate: number;
    totalVariableDebt: string;
    totalStableDebt: string;
    ltv: number;
    liquidationThreshold: number;
    liquidationBonus: number;
    priceUsd: number;
  }>;
  aggregateMetrics: {
    totalTvlUsd: number;
    weightedAvgSupplyApy: number;
    weightedAvgBorrowApy: number;
  };
  dataFreshness: string;
}

export interface AaveUserPositionsOutput {
  userAddress: string;
  chain: string;
  positions: Array<{
    reserve: {
      symbol: string;
      name: string;
    };
    supplyBalance: string;
    supplyBalanceUsd: number;
    currentApy: number;
    variableDebt: string;
    variableDebtUsd: number;
    variableBorrowApy: number;
    stableDebt: string;
    stableDebtUsd: number;
    stableBorrowApy: number;
    usedAsCollateral: boolean;
  }>;
  summary: {
    totalSuppliedUsd: number;
    totalBorrowedUsd: number;
    netWorthUsd: number;
    healthFactor: number | null;
    availableBorrowsUsd: number;
  };
  dataFreshness: string;
}

export interface AaveRateHistoryOutput {
  symbol: string;
  chain: string;
  reserveId: string;
  history: Array<{
    timestamp: string;
    supplyApy: number;
    variableBorrowApy: number;
    stableBorrowApy: number | null;
    utilizationRate: number;
    totalLiquidityUsd: number;
  }>;
  statistics: {
    avgSupplyApy: number;
    avgBorrowApy: number;
    maxSupplyApy: number;
    minSupplyApy: number;
    volatility: number;
  };
  dataFreshness: string;
}
