import { z } from 'zod';

// ========== Input Schemas ==========

export const CompoundMarketsInputSchema = z.object({
  chain: z.enum(['ethereum', 'arbitrum', 'polygon', 'base']).default('ethereum'),
  marketId: z.string().optional().describe('Specific market address (Comet proxy)')
});
export type CompoundMarketsInput = z.infer<typeof CompoundMarketsInputSchema>;

export const CompoundAccountInputSchema = z.object({
  accountAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chain: z.enum(['ethereum', 'arbitrum', 'polygon', 'base']).default('ethereum'),
  marketId: z.string().optional().describe('Filter to specific market')
});
export type CompoundAccountInput = z.infer<typeof CompoundAccountInputSchema>;

export const CompoundHistoryInputSchema = z.object({
  marketId: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Market address required'),
  chain: z.enum(['ethereum', 'arbitrum', 'polygon', 'base']).default('ethereum'),
  days: z.number().min(1).max(365).default(30)
});
export type CompoundHistoryInput = z.infer<typeof CompoundHistoryInputSchema>;

// ========== Subgraph Response Types ==========

export interface CompoundToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  lastPriceUSD: string;
}

export interface CompoundRate {
  rate: string;
  side: string;  // "LENDER" or "BORROWER"
  type: string;  // "VARIABLE" or "STABLE"
}

export interface CompoundMarket {
  id: string;
  cometProxy: string;
  protocol: {
    id: string;
    name: string;
  };
  inputToken: CompoundToken;
  totalValueLockedUSD: string;
  totalDepositBalanceUSD: string;
  totalBorrowBalanceUSD: string;
  inputTokenBalance: string;
  inputTokenPriceUSD: string;
  rates: CompoundRate[];
  rewardTokens?: Array<{
    token: {
      symbol: string;
      decimals: number;
    };
    type: string;
  }>;
}

export interface CompoundPosition {
  id: string;
  hashOpened: string;
  balance: string;
  side: string;  // "LENDER" or "BORROWER"
  isCollateral: boolean;
  asset: {
    symbol: string;
    decimals: number;
    lastPriceUSD: string;
  };
  market: {
    id: string;
    inputToken: {
      symbol: string;
    };
  };
}

export interface CompoundAccount {
  id: string;
  positionCount: number;
  depositCount: number;
  withdrawCount: number;
  borrowCount: number;
  repayCount: number;
  liquidationCount: number;
  positions: CompoundPosition[];
}

export interface CompoundMarketSnapshot {
  id: string;
  timestamp: string;
  totalValueLockedUSD: string;
  totalDepositBalanceUSD: string;
  totalBorrowBalanceUSD: string;
  rates: CompoundRate[];
  dailySupplySideRevenueUSD: string;
  dailyProtocolSideRevenueUSD: string;
  dailyTotalRevenueUSD: string;
}

export interface CompoundMarketsResponse {
  markets: CompoundMarket[];
}

export interface CompoundMarketResponse {
  market: CompoundMarket | null;
}

export interface CompoundAccountsResponse {
  accounts: CompoundAccount[];
}

export interface CompoundSnapshotsResponse {
  marketDailySnapshots: CompoundMarketSnapshot[];
}

// ========== Output Types ==========

export interface CompoundMarketsOutput {
  chain: string;
  markets: Array<{
    id: string;
    cometProxy: string;
    baseAsset: {
      symbol: string;
      name: string;
      decimals: number;
    };
    totalSupplyUsd: number;
    totalBorrowUsd: number;
    tvlUsd: number;
    supplyApy: number;
    borrowApy: number;
    utilization: number;
    rewardTokens: string[];
  }>;
  aggregateMetrics: {
    totalTvlUsd: number;
    totalSupplyUsd: number;
    totalBorrowUsd: number;
  };
  dataFreshness: string;
}

export interface CompoundAccountOutput {
  accountAddress: string;
  chain: string;
  positions: Array<{
    market: {
      id: string;
      baseAsset: string;
    };
    asset: string;
    balance: string;
    balanceUsd: number;
    side: 'supply' | 'borrow';
    isCollateral: boolean;
  }>;
  summary: {
    totalSuppliedUsd: number;
    totalBorrowedUsd: number;
    totalCollateralUsd: number;
    netPositionUsd: number;
    positionCount: number;
    liquidationCount: number;
  };
  dataFreshness: string;
}

export interface CompoundHistoryOutput {
  marketId: string;
  chain: string;
  baseAsset: string;
  history: Array<{
    timestamp: string;
    supplyApy: number;
    borrowApy: number;
    utilization: number;
    totalSupplyUsd: number;
    totalBorrowUsd: number;
    dailyRevenueUsd: number;
  }>;
  statistics: {
    avgSupplyApy: number;
    avgBorrowApy: number;
    avgUtilization: number;
    tvlChange: number;
    totalRevenue: number;
  };
  dataFreshness: string;
}
