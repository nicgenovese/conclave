import { z } from 'zod';

// Supported chains
export const ChainSchema = z.enum([
  'ethereum',
  'arbitrum',
  'optimism',
  'polygon',
  'base',
  'avalanche',
  'bsc'
]);
export type Chain = z.infer<typeof ChainSchema>;

// Tool input schemas
export const WalletProfileInputSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chain: ChainSchema.default('ethereum'),
  limit: z.number().min(10).max(100).default(100)
});
export type WalletProfileInput = z.infer<typeof WalletProfileInputSchema>;

export const ExchangeFlowsInputSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chain: ChainSchema.default('ethereum'),
  period: z.enum(['7d', '30d']).default('30d')
});
export type ExchangeFlowsInput = z.infer<typeof ExchangeFlowsInputSchema>;

export const WhaleTransactionsInputSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chain: ChainSchema.default('ethereum'),
  minValueUsd: z.number().min(10000).default(100000),
  period: z.enum(['24h', '7d', '30d']).default('7d'),
  limit: z.number().min(10).max(500).default(100)
});
export type WhaleTransactionsInput = z.infer<typeof WhaleTransactionsInputSchema>;

export const TvlHistoryInputSchema = z.object({
  protocol: z.string().min(1, 'Protocol slug is required'),
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d')
});
export type TvlHistoryInput = z.infer<typeof TvlHistoryInputSchema>;

// Tool output types
export interface WalletProfileOutput {
  tokenAddress: string;
  chain: string;
  totalHolders: number;
  topHolders: Array<{
    address: string;
    balance: string;
    balanceUsd: number;
    percentOfSupply: number;
    label: string | null;
    category: 'Exchange' | 'Fund/VC' | 'Team' | 'Protocol' | 'Smart Money' | 'Unknown';
  }>;
  concentrationMetrics: {
    top10Percent: number;
    top25Percent: number;
    top50Percent: number;
  };
  holderTrend: 'Accumulating' | 'Stable' | 'Distributing';
  smartMoneyHoldings: {
    addressCount: number;
    totalValueUsd: number;
    percentOfSupply: number;
  };
  dataFreshness: string;
}

export interface ExchangeFlowsOutput {
  tokenAddress: string;
  chain: string;
  period: '7d' | '30d';
  summary: {
    netflowUsd: number;
    totalInflowUsd: number;
    totalOutflowUsd: number;
    flowSignal: 'Bullish' | 'Neutral' | 'Bearish';
  };
  dailyFlows: Array<{
    date: string;
    inflowUsd: number;
    outflowUsd: number;
    netflowUsd: number;
  }>;
  exchangeBreakdown: Array<{
    exchange: string;
    inflowUsd: number;
    outflowUsd: number;
    netflowUsd: number;
  }>;
  dataFreshness: string;
}

export interface WhaleTransactionsOutput {
  tokenAddress: string;
  chain: string;
  period: string;
  minValueUsd: number;
  transactions: Array<{
    txHash: string;
    blockNumber: number;
    timestamp: string;
    from: string;
    fromLabel: string | null;
    to: string;
    toLabel: string | null;
    valueToken: string;
    valueUsd: number;
    txType: 'Transfer' | 'ExchangeDeposit' | 'ExchangeWithdrawal' | 'ProtocolInteraction';
  }>;
  statistics: {
    totalTransactions: number;
    totalVolumeUsd: number;
    avgTransactionUsd: number;
    largestTransactionUsd: number;
  };
  dataFreshness: string;
}

export interface TvlHistoryOutput {
  protocol: string;
  protocolName: string;
  currentTvlUsd: number;
  tvlChange: {
    change7d: number;
    change30d: number;
    change90d: number | null;
  };
  chainDistribution: Array<{
    chain: string;
    tvlUsd: number;
    percentOfTotal: number;
  }>;
  historicalTvl: Array<{
    date: string;
    tvlUsd: number;
  }>;
  liquidityHealth: 'Deep' | 'Adequate' | 'Shallow' | 'Critical';
  dataFreshness: string;
}

// API response types
export interface DefiLlamaProtocol {
  id: string;
  name: string;
  slug: string;
  tvl: number;
  chainTvls: Record<string, number>;
  change_1d?: number;
  change_7d?: number;
  change_1m?: number;
}

export interface DefiLlamaTvlHistory {
  date: number;
  totalLiquidityUSD: number;
}

export interface DuneExecutionResponse {
  execution_id: string;
  state: string;
}

export interface DuneResultResponse {
  execution_id: string;
  state: string;
  result?: {
    rows: Record<string, unknown>[];
    metadata: {
      column_names: string[];
      row_count: number;
    };
  };
}
