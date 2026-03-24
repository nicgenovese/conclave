import type { VolatilityInput, VolatilityOutput } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import type { MetalsApiClient } from '../clients/metals.js';

interface VolatilityContext {
  cache: CacheManager;
  metalsClient: MetalsApiClient;
}

export async function handleVolatility(
  input: VolatilityInput,
  ctx: VolatilityContext
): Promise<VolatilityOutput> {
  const cacheKey = ctx.cache.generateKey('volatility', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<VolatilityOutput>(cacheKey);
  if (cached) return cached;

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();

  switch (input.period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch historical prices
  const history = await ctx.metalsClient.getHistoricalPrices(
    input.commodity,
    startDateStr,
    endDateStr,
    'USD'
  );

  const prices = history.map(h => h.price);
  const currentPrice = prices[prices.length - 1] || 0;

  // Calculate daily returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  // Calculate volatility metrics
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance) * 100; // As percentage
  const annualizedVol = dailyVol * Math.sqrt(252); // 252 trading days
  const realizedVol = dailyVol; // Same as daily for this calculation

  // Calculate max drawdown
  let peak = prices[0];
  let maxDrawdown = 0;
  let drawdownDate = history[0]?.date || '';

  for (let i = 0; i < prices.length; i++) {
    if (prices[i] > peak) {
      peak = prices[i];
    }
    const drawdown = (peak - prices[i]) / peak * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      drawdownDate = history[i]?.date || '';
    }
  }

  // Calculate VaR (historical method)
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95Index = Math.floor(returns.length * 0.05);
  const var99Index = Math.floor(returns.length * 0.01);
  const valueAtRisk95 = Math.abs(sortedReturns[var95Index] || 0) * 100;
  const valueAtRisk99 = Math.abs(sortedReturns[var99Index] || 0) * 100;

  // Determine risk level
  let riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  if (annualizedVol < 10) riskLevel = 'low';
  else if (annualizedVol < 20) riskLevel = 'moderate';
  else if (annualizedVol < 40) riskLevel = 'high';
  else riskLevel = 'extreme';

  // Compare to gold (if not already gold)
  let vsGold: number | null = null;
  if (input.commodity !== 'XAU') {
    try {
      const goldHistory = await ctx.metalsClient.getHistoricalPrices('XAU', startDateStr, endDateStr, 'USD');
      const goldPrices = goldHistory.map(h => h.price);
      const goldReturns: number[] = [];
      for (let i = 1; i < goldPrices.length; i++) {
        goldReturns.push((goldPrices[i] - goldPrices[i - 1]) / goldPrices[i - 1]);
      }
      const goldAvgReturn = goldReturns.reduce((a, b) => a + b, 0) / goldReturns.length;
      const goldVariance = goldReturns.reduce((sum, r) => sum + Math.pow(r - goldAvgReturn, 2), 0) / goldReturns.length;
      const goldVol = Math.sqrt(goldVariance) * 100 * Math.sqrt(252);
      vsGold = annualizedVol / goldVol;
    } catch {
      // Ignore comparison if gold data unavailable
    }
  }

  const result: VolatilityOutput = {
    commodity: input.commodity,
    period: input.period,
    currentPrice,
    volatility: {
      daily: dailyVol,
      annualized: annualizedVol,
      realized: realizedVol
    },
    drawdown: {
      maxDrawdown,
      drawdownDate,
      recoveryDays: null // Would need additional calculation
    },
    riskMetrics: {
      sharpeRatio: null, // Would need risk-free rate
      valueAtRisk95,
      valueAtRisk99
    },
    comparison: {
      vsGold,
      vsBtc: null,
      vsEth: null
    },
    riskLevel,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'volatility');
  return result;
}
