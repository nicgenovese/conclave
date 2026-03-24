import type { OracleComparisonInput, OracleComparisonOutput } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import type { PythClient } from '../clients/pyth.js';
import type { ChainlinkClient } from '../clients/chainlink.js';
import type { MetalsApiClient } from '../clients/metals.js';

interface OracleComparisonContext {
  cache: CacheManager;
  pythClient: PythClient;
  chainlinkClient: ChainlinkClient;
  metalsClient: MetalsApiClient;
}

interface SourcePrice {
  name: string;
  type: 'onchain' | 'traditional';
  price: number;
  staleness: number;
  status: string;
}

export async function handleOracleComparison(
  input: OracleComparisonInput,
  ctx: OracleComparisonContext
): Promise<OracleComparisonOutput> {
  const cacheKey = ctx.cache.generateKey('oracleComparison', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<OracleComparisonOutput>(cacheKey);
  if (cached) return cached;

  const sources: SourcePrice[] = [];
  const now = Math.floor(Date.now() / 1000);

  // Fetch from Pyth
  if (ctx.pythClient.hasFeed(input.commodity)) {
    try {
      const pythData = await ctx.pythClient.getLatestPrice(input.commodity);
      const staleness = now - pythData.timestamp;
      sources.push({
        name: 'Pyth Network',
        type: 'onchain',
        price: pythData.price,
        staleness,
        status: staleness < 60 ? 'healthy' : staleness < 300 ? 'stale' : 'critical'
      });
    } catch {
      sources.push({
        name: 'Pyth Network',
        type: 'onchain',
        price: 0,
        staleness: 0,
        status: 'unavailable'
      });
    }
  }

  // Fetch from Chainlink
  if (ctx.chainlinkClient.hasFeed(input.commodity)) {
    try {
      const chainlinkData = await ctx.chainlinkClient.getLatestPrice(input.commodity);
      sources.push({
        name: 'Chainlink',
        type: 'onchain',
        price: chainlinkData.price,
        staleness: chainlinkData.staleness,
        status: chainlinkData.isStale ? 'stale' : 'healthy'
      });
    } catch {
      sources.push({
        name: 'Chainlink',
        type: 'onchain',
        price: 0,
        staleness: 0,
        status: 'unavailable'
      });
    }
  }

  // Fetch from traditional source (Metals-API)
  if (input.includeTraditional && ctx.metalsClient.isConfigured() && ctx.metalsClient.hasCommodity(input.commodity)) {
    try {
      const metalsData = await ctx.metalsClient.getLatestPrice(input.commodity, 'USD');
      const staleness = now - metalsData.timestamp;
      sources.push({
        name: 'Metals-API',
        type: 'traditional',
        price: metalsData.price,
        staleness,
        status: staleness < 3600 ? 'healthy' : 'stale'
      });
    } catch {
      sources.push({
        name: 'Metals-API',
        type: 'traditional',
        price: 0,
        staleness: 0,
        status: 'unavailable'
      });
    }
  }

  // Analyze prices
  const availableSources = sources.filter(s => s.status !== 'unavailable' && s.price > 0);

  if (availableSources.length === 0) {
    throw new Error('No oracle sources available for comparison');
  }

  const prices = availableSources.map(s => s.price);
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const spread = maxPrice - minPrice;
  const spreadPercent = (spread / mean) * 100;

  // Find outliers (>1% from median)
  const outliers = availableSources
    .filter(s => Math.abs(s.price - median) / median > 0.01)
    .map(s => s.name);

  // Determine consensus level
  let consensus: 'strong' | 'moderate' | 'weak' | 'divergent';
  if (spreadPercent < 0.1) consensus = 'strong';
  else if (spreadPercent < 0.5) consensus = 'moderate';
  else if (spreadPercent < 1) consensus = 'weak';
  else consensus = 'divergent';

  // Arbitrage analysis
  const maxSpread = spreadPercent;
  let opportunity: 'none' | 'minor' | 'significant';
  let recommendation: string;

  if (maxSpread < 0.1) {
    opportunity = 'none';
    recommendation = 'No arbitrage opportunity - prices well aligned';
  } else if (maxSpread < 0.5) {
    opportunity = 'minor';
    recommendation = 'Minor price discrepancy - may not cover transaction costs';
  } else {
    opportunity = 'significant';
    const highSource = availableSources.find(s => s.price === maxPrice);
    const lowSource = availableSources.find(s => s.price === minPrice);
    recommendation = `Potential arbitrage: ${lowSource?.name} ($${minPrice.toFixed(2)}) vs ${highSource?.name} ($${maxPrice.toFixed(2)})`;
  }

  const result: OracleComparisonOutput = {
    commodity: input.commodity,
    timestamp: new Date().toISOString(),
    sources,
    analysis: {
      median,
      mean,
      spread,
      spreadPercent,
      outliers
    },
    arbitrage: {
      maxSpread,
      opportunity,
      recommendation
    },
    consensus,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'oracleComparison');
  return result;
}
