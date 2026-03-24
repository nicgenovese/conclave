import type { CacheManager } from '../utils/cache.js';
import type { CoinGeckoClient } from '../clients/coingecko.js';
import type { VolatilityInput, VolatilityOutput } from '../types/index.js';

interface VolatilityContext {
  cache: CacheManager;
  coingeckoClient: CoinGeckoClient;
}

function periodToDays(period: string): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    default: return 30;
  }
}

function calculateDailyReturns(prices: [number, number][]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prevPrice = prices[i - 1][1];
    const currentPrice = prices[i][1];
    if (prevPrice > 0) {
      returns.push((currentPrice - prevPrice) / prevPrice);
    }
  }
  return returns;
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

function calculateMaxDrawdown(prices: [number, number][]): {
  maxDrawdown: number;
  maxDrawdownDate: string;
} {
  let maxDrawdown = 0;
  let maxDrawdownDate = '';
  let peak = 0;

  for (const [timestamp, price] of prices) {
    if (price > peak) {
      peak = price;
    }
    const drawdown = peak > 0 ? ((peak - price) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownDate = new Date(timestamp).toISOString().split('T')[0];
    }
  }

  return { maxDrawdown, maxDrawdownDate };
}

function determineRiskRating(
  annualizedVolatility: number
): 'Low' | 'Moderate' | 'High' | 'Extreme' {
  if (annualizedVolatility < 30) return 'Low';
  if (annualizedVolatility < 60) return 'Moderate';
  if (annualizedVolatility < 100) return 'High';
  return 'Extreme';
}

export async function handleVolatility(
  input: VolatilityInput,
  ctx: VolatilityContext
): Promise<VolatilityOutput> {
  // Check cache first
  const cacheKey = ctx.cache.generateKey('volatility', {
    tokenId: input.tokenId,
    period: input.period
  });
  const cached = ctx.cache.get<VolatilityOutput>(cacheKey);
  if (cached) return cached;

  // Fetch market chart from CoinGecko
  const days = periodToDays(input.period);
  const marketChart = await ctx.coingeckoClient.getMarketChart(input.tokenId, days);

  const prices = marketChart.prices;
  if (prices.length < 2) {
    throw new Error('Insufficient price data for volatility calculation');
  }

  // Calculate daily returns and volatility
  const dailyReturns = calculateDailyReturns(prices);
  const dailyVolatility = calculateStandardDeviation(dailyReturns) * 100; // Convert to percentage
  const annualizedVolatility = dailyVolatility * Math.sqrt(365);

  // Calculate max drawdown
  const { maxDrawdown, maxDrawdownDate } = calculateMaxDrawdown(prices);

  // Calculate price range
  const priceValues = prices.map(p => p[1]);
  const high = Math.max(...priceValues);
  const low = Math.min(...priceValues);
  const current = priceValues[priceValues.length - 1];

  const result: VolatilityOutput = {
    tokenId: input.tokenId,
    period: input.period,
    volatilityMetrics: {
      dailyVolatility: Math.round(dailyVolatility * 100) / 100,
      annualizedVolatility: Math.round(annualizedVolatility * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      maxDrawdownDate
    },
    priceRange: {
      high,
      low,
      current,
      percentFromHigh: high > 0 ? Math.round(((high - current) / high) * 10000) / 100 : 0,
      percentFromLow: low > 0 ? Math.round(((current - low) / low) * 10000) / 100 : 0
    },
    riskRating: determineRiskRating(annualizedVolatility),
    dataFreshness: new Date().toISOString()
  };

  // Cache the result
  ctx.cache.set(cacheKey, result, 'volatility');

  return result;
}
