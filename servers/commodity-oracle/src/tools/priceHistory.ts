import type { PriceHistoryInput, PriceHistoryOutput, OHLCVData } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import type { MetalsApiClient } from '../clients/metals.js';

interface PriceHistoryContext {
  cache: CacheManager;
  metalsClient: MetalsApiClient;
}

export async function handlePriceHistory(
  input: PriceHistoryInput,
  ctx: PriceHistoryContext
): Promise<PriceHistoryOutput> {
  const cacheKey = ctx.cache.generateKey('priceHistory', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<PriceHistoryOutput>(cacheKey);
  if (cached) return cached;

  // Calculate date range based on period
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
    case '5y':
      startDate.setFullYear(startDate.getFullYear() - 5);
      break;
  }

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch historical data
  const rawHistory = await ctx.metalsClient.getHistoricalPrices(
    input.commodity,
    startDateStr,
    endDateStr,
    input.quoteCurrency
  );

  // Convert to OHLCV format (using close price as all values since API gives daily close)
  const history: OHLCVData[] = rawHistory.map(h => ({
    date: h.date,
    open: h.price,
    high: h.price,
    low: h.price,
    close: h.price
  }));

  // Apply interval filtering
  let filteredHistory = history;
  if (input.interval === 'weekly') {
    // Take every 7th data point
    filteredHistory = history.filter((_, i) => i % 7 === 0);
  }

  // Calculate statistics
  const prices = filteredHistory.map(h => h.close);
  const currentPrice = prices[prices.length - 1] || 0;
  const sortedPrices = [...prices].sort((a, b) => a - b);

  const statistics = {
    high: Math.max(...prices),
    low: Math.min(...prices),
    average: prices.reduce((a, b) => a + b, 0) / prices.length,
    median: sortedPrices[Math.floor(sortedPrices.length / 2)]
  };

  // Calculate price changes
  const getChangeAt = (daysAgo: number): number | null => {
    const targetIdx = prices.length - 1 - daysAgo;
    if (targetIdx < 0) return null;
    return ((currentPrice - prices[targetIdx]) / prices[targetIdx]) * 100;
  };

  const priceChange = {
    change24h: getChangeAt(1) || 0,
    change7d: getChangeAt(7) || 0,
    change30d: getChangeAt(30) || 0,
    change90d: getChangeAt(90),
    changeYtd: null as number | null // Would need YTD calculation
  };

  // Calculate YTD
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const ytdDays = Math.floor((Date.now() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
  priceChange.changeYtd = getChangeAt(ytdDays);

  const result: PriceHistoryOutput = {
    commodity: input.commodity,
    quoteCurrency: input.quoteCurrency,
    period: input.period,
    interval: input.interval,
    currentPrice,
    priceChange,
    history: filteredHistory,
    statistics,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'priceHistory');
  return result;
}
