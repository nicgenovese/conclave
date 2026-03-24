import type { CacheManager } from '../utils/cache.js';
import type { DefiLlamaClient } from '../clients/defillama.js';
import type { ProtocolRevenueInput, ProtocolRevenueOutput } from '../types/index.js';

interface ProtocolRevenueContext {
  cache: CacheManager;
  defiLlamaClient: DefiLlamaClient;
}

function determineValueCaptureRating(
  revenueShare: number
): 'Strong' | 'Moderate' | 'Weak' | 'None' {
  if (revenueShare >= 50) return 'Strong';
  if (revenueShare >= 20) return 'Moderate';
  if (revenueShare > 0) return 'Weak';
  return 'None';
}

function determineTrend(
  current: number,
  previous: number
): 'Growing' | 'Stable' | 'Declining' {
  if (previous === 0) return 'Stable';
  const change = ((current - previous) / previous) * 100;
  if (change > 10) return 'Growing';
  if (change < -10) return 'Declining';
  return 'Stable';
}

export async function handleProtocolRevenue(
  input: ProtocolRevenueInput,
  ctx: ProtocolRevenueContext
): Promise<ProtocolRevenueOutput> {
  // Check cache first
  const cacheKey = ctx.cache.generateKey('protocolRevenue', {
    protocol: input.protocol,
    period: input.period
  });
  const cached = ctx.cache.get<ProtocolRevenueOutput>(cacheKey);
  if (cached) return cached;

  // Fetch fees data from DefiLlama
  const feesData = await ctx.defiLlamaClient.getProtocolFees(input.protocol);

  if (!feesData) {
    throw new Error(`No fees data found for protocol: ${input.protocol}`);
  }

  // Calculate metrics based on period
  let totalFees: number;
  let totalRevenue: number;
  let dailyFees: number;
  let dailyRevenue: number;
  let previousPeriodFees: number;

  switch (input.period) {
    case '24h':
      totalFees = feesData.total24h || 0;
      totalRevenue = feesData.revenue24h || 0;
      dailyFees = totalFees;
      dailyRevenue = totalRevenue;
      previousPeriodFees = feesData.total7d ? feesData.total7d / 7 : 0;
      break;
    case '7d':
      totalFees = feesData.total7d || 0;
      totalRevenue = feesData.revenue7d || 0;
      dailyFees = totalFees / 7;
      dailyRevenue = totalRevenue / 7;
      previousPeriodFees = feesData.total30d ? (feesData.total30d / 30) * 7 : 0;
      break;
    case '30d':
    default:
      totalFees = feesData.total30d || 0;
      totalRevenue = feesData.revenue30d || 0;
      dailyFees = totalFees / 30;
      dailyRevenue = totalRevenue / 30;
      // Use 7d data extrapolated for comparison
      previousPeriodFees = feesData.total7d ? (feesData.total7d / 7) * 30 : 0;
      break;
  }

  // Calculate revenue share (what % of fees goes to token holders/protocol)
  const revenueShare = totalFees > 0 ? (totalRevenue / totalFees) * 100 : 0;

  // Determine trend by comparing current to previous period
  const trend = determineTrend(totalFees, previousPeriodFees);

  const result: ProtocolRevenueOutput = {
    protocol: input.protocol,
    protocolName: input.protocol, // DefiLlama fees endpoint doesn't return name separately
    period: input.period,
    fees: {
      total: totalFees,
      daily: dailyFees,
      trend
    },
    revenue: {
      total: totalRevenue,
      daily: dailyRevenue,
      revenueShare
    },
    valueCaptureRating: determineValueCaptureRating(revenueShare),
    dataFreshness: new Date().toISOString()
  };

  // Cache the result
  ctx.cache.set(cacheKey, result, 'protocolRevenue');

  return result;
}
