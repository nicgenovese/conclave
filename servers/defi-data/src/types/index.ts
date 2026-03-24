import { z } from 'zod';

// ========== Common Schemas ==========

export const ChainSchema = z.enum([
  'ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'avalanche', 'bsc'
]);
export type Chain = z.infer<typeof ChainSchema>;

export const PeriodSchema = z.enum(['7d', '30d', '90d', '1y']);
export type Period = z.infer<typeof PeriodSchema>;

// ========== Input Schemas ==========

export const TokenMetricsInputSchema = z.object({
  tokenId: z.string().min(1, 'Token ID required (CoinGecko ID like "aave", "uniswap")'),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  chain: ChainSchema.optional()
});
export type TokenMetricsInput = z.infer<typeof TokenMetricsInputSchema>;

export const ProtocolMetricsInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required (e.g., "aave", "uniswap")')
});
export type ProtocolMetricsInput = z.infer<typeof ProtocolMetricsInputSchema>;

export const ProtocolRevenueInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  period: z.enum(['24h', '7d', '30d']).default('30d')
});
export type ProtocolRevenueInput = z.infer<typeof ProtocolRevenueInputSchema>;

export const VolatilityInputSchema = z.object({
  tokenId: z.string().min(1, 'Token ID required'),
  period: PeriodSchema.default('30d')
});
export type VolatilityInput = z.infer<typeof VolatilityInputSchema>;

export const LiquidityDepthInputSchema = z.object({
  tokenId: z.string().min(1, 'Token ID required'),
  positionSizes: z.array(z.number()).default([100000, 500000, 1000000])
});
export type LiquidityDepthInput = z.infer<typeof LiquidityDepthInputSchema>;

export const StakingYieldsInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug required'),
  chain: ChainSchema.optional()
});
export type StakingYieldsInput = z.infer<typeof StakingYieldsInputSchema>;

export const EmissionsScheduleInputSchema = z.object({
  tokenId: z.string().min(1, 'Token ID required'),
  period: z.enum(['30d', '90d', '1y']).default('90d')
});
export type EmissionsScheduleInput = z.infer<typeof EmissionsScheduleInputSchema>;

// ========== Output Types ==========

export interface TokenMetricsOutput {
  tokenId: string;
  name: string;
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChange7d: number;
  marketCap: number;
  fullyDilutedValuation: number | null;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  circulatingToTotalRatio: number | null;
  allTimeHigh: number;
  allTimeHighDate: string;
  athDrawdown: number;
  dataFreshness: string;
}

export interface ProtocolMetricsOutput {
  protocol: string;
  protocolName: string;
  category: string;
  currentTvlUsd: number;
  tvlChange: {
    change24h: number;
    change7d: number;
    change30d: number;
  };
  chainDistribution: Array<{
    chain: string;
    tvlUsd: number;
    percentOfTotal: number;
  }>;
  historicalTvl: Array<{ date: string; tvlUsd: number }>;
  liquidityHealth: 'Deep' | 'Adequate' | 'Shallow' | 'Critical';
  dataFreshness: string;
}

export interface ProtocolRevenueOutput {
  protocol: string;
  protocolName: string;
  period: string;
  fees: {
    total: number;
    daily: number;
    trend: 'Growing' | 'Stable' | 'Declining';
  };
  revenue: {
    total: number;
    daily: number;
    revenueShare: number;
  };
  valueCaptureRating: 'Strong' | 'Moderate' | 'Weak' | 'None';
  dataFreshness: string;
}

export interface VolatilityOutput {
  tokenId: string;
  period: string;
  volatilityMetrics: {
    dailyVolatility: number;
    annualizedVolatility: number;
    maxDrawdown: number;
    maxDrawdownDate: string;
  };
  priceRange: {
    high: number;
    low: number;
    current: number;
    percentFromHigh: number;
    percentFromLow: number;
  };
  riskRating: 'Low' | 'Moderate' | 'High' | 'Extreme';
  dataFreshness: string;
}

export interface LiquidityDepthOutput {
  tokenId: string;
  totalDexLiquidity: number;
  pools: Array<{
    dex: string;
    chain: string;
    pair: string;
    tvlUsd: number;
    volume24h: number;
  }>;
  slippageProfile: Array<{
    positionSizeUsd: number;
    estimatedSlippage: number;
    executable: boolean;
  }>;
  liquidityRating: 'Deep' | 'Adequate' | 'Shallow' | 'Critical';
  dataFreshness: string;
}

export interface StakingYieldsOutput {
  protocol: string;
  stakingPools: Array<{
    poolName: string;
    chain: string;
    apy: number;
    apyBase: number;
    apyReward: number;
    tvlUsd: number;
    rewardToken: string;
  }>;
  aggregateMetrics: {
    totalStakedUsd: number;
    weightedAverageApy: number;
  };
  sustainabilityRating: 'Sustainable' | 'Moderate' | 'Unsustainable';
  dataFreshness: string;
}

export interface EmissionsScheduleOutput {
  tokenId: string;
  tokenName: string;
  period: string;
  currentCirculating: number;
  upcomingUnlocks: Array<{
    date: string;
    amount: number;
    valueUsd: number;
    percentOfCirculating: number;
    allocation: string;
  }>;
  emissionMetrics: {
    dailyEmissionRate: number;
    monthlyEmissionRate: number;
    emissionPressure: 'Low' | 'Medium' | 'High' | 'Critical';
  };
  dataFreshness: string;
}

// ========== API Response Types ==========

// CoinGecko types
export interface CoinGeckoCoinData {
  id: string;
  symbol: string;
  name: string;
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    fully_diluted_valuation: { usd: number } | null;
    total_volume: { usd: number };
    high_24h: { usd: number };
    low_24h: { usd: number };
    price_change_24h: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
    ath: { usd: number };
    ath_date: { usd: string };
    ath_change_percentage: { usd: number };
  };
}

export interface CoinGeckoMarketChart {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

// DefiLlama types
export interface DefiLlamaProtocol {
  id: string;
  name: string;
  slug: string;
  category: string;
  tvl: number;
  chainTvls: Record<string, number>;
  change_1h: number;
  change_1d: number;
  change_7d: number;
}

export interface DefiLlamaProtocolDetails {
  id: string;
  name: string;
  slug: string;
  category: string;
  tvl: Array<{ date: number; totalLiquidityUSD: number }>;
  currentChainTvls: Record<string, number>;
  chains: string[];
}

export interface DefiLlamaFeesProtocol {
  name: string;
  slug: string;
  total24h: number | null;
  total7d: number | null;
  total30d: number | null;
  totalAllTime: number | null;
  revenue24h: number | null;
  revenue7d: number | null;
  revenue30d: number | null;
}

export interface DefiLlamaFeesOverview {
  protocols: DefiLlamaFeesProtocol[];
}

// ========== Context Types ==========

export interface ToolContext {
  cache: CacheManager;
  coingeckoClient?: CoinGeckoClient;
  defiLlamaClient?: DefiLlamaClient;
}

// Forward declarations (will be properly imported in actual usage)
export type CacheManager = import('../utils/cache.js').CacheManager;
export type CoinGeckoClient = import('../clients/coingecko.js').CoinGeckoClient;
export type DefiLlamaClient = import('../clients/defillama.js').DefiLlamaClient;
