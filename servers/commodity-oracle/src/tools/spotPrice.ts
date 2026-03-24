import type { SpotPriceInput, SpotPriceOutput, PriceData } from '../types/index.js';
import type { CacheManager } from '../utils/cache.js';
import type { PythClient } from '../clients/pyth.js';
import type { ChainlinkClient } from '../clients/chainlink.js';
import type { MetalsApiClient } from '../clients/metals.js';

interface SpotPriceContext {
  cache: CacheManager;
  pythClient: PythClient;
  chainlinkClient: ChainlinkClient;
  metalsClient: MetalsApiClient;
}

export async function handleSpotPrice(
  input: SpotPriceInput,
  ctx: SpotPriceContext
): Promise<SpotPriceOutput> {
  const cacheKey = ctx.cache.generateKey('spotPrice', input as unknown as Record<string, unknown>);
  const cached = ctx.cache.get<SpotPriceOutput>(cacheKey);
  if (cached) return cached;

  const prices: PriceData[] = [];
  const now = Date.now();

  // Fetch from each requested source in parallel
  const fetchPromises: Promise<void>[] = [];

  for (const source of input.sources) {
    if (source === 'pyth' && ctx.pythClient.hasFeed(input.commodity)) {
      fetchPromises.push(
        ctx.pythClient.getLatestPrice(input.commodity)
          .then(data => {
            const staleness = Math.floor(now / 1000) - data.timestamp;
            prices.push({
              source: 'pyth',
              price: data.price,
              confidence: data.confidence,
              timestamp: new Date(data.timestamp * 1000).toISOString(),
              staleness,
              status: staleness < 60 ? 'fresh' : staleness < 300 ? 'stale' : 'unavailable'
            });
          })
          .catch(() => {
            prices.push({
              source: 'pyth',
              price: 0,
              timestamp: new Date().toISOString(),
              staleness: 0,
              status: 'unavailable'
            });
          })
      );
    }

    if (source === 'chainlink' && ctx.chainlinkClient.hasFeed(input.commodity)) {
      fetchPromises.push(
        ctx.chainlinkClient.getLatestPrice(input.commodity)
          .then(data => {
            prices.push({
              source: 'chainlink',
              price: data.price,
              timestamp: new Date(data.timestamp * 1000).toISOString(),
              staleness: data.staleness,
              status: data.isStale ? 'stale' : 'fresh'
            });
          })
          .catch(() => {
            prices.push({
              source: 'chainlink',
              price: 0,
              timestamp: new Date().toISOString(),
              staleness: 0,
              status: 'unavailable'
            });
          })
      );
    }

    if (source === 'metals_api' && ctx.metalsClient.isConfigured() && ctx.metalsClient.hasCommodity(input.commodity)) {
      fetchPromises.push(
        ctx.metalsClient.getLatestPrice(input.commodity, input.quoteCurrency)
          .then(data => {
            const staleness = Math.floor(now / 1000) - data.timestamp;
            prices.push({
              source: 'metals_api',
              price: data.price,
              timestamp: new Date(data.timestamp * 1000).toISOString(),
              staleness,
              status: staleness < 3600 ? 'fresh' : 'stale'
            });
          })
          .catch(() => {
            prices.push({
              source: 'metals_api',
              price: 0,
              timestamp: new Date().toISOString(),
              staleness: 0,
              status: 'unavailable'
            });
          })
      );
    }
  }

  await Promise.all(fetchPromises);

  // Calculate consensus
  const availablePrices = prices.filter(p => p.status !== 'unavailable' && p.price > 0);
  let consensus: SpotPriceOutput['consensus'];

  if (availablePrices.length === 0) {
    consensus = {
      price: 0,
      spread: 0,
      spreadPercent: 0,
      agreement: 'weak'
    };
  } else {
    const priceValues = availablePrices.map(p => p.price);
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const maxPrice = Math.max(...priceValues);
    const minPrice = Math.min(...priceValues);
    const spread = maxPrice - minPrice;
    const spreadPercent = (spread / avgPrice) * 100;

    let agreement: 'strong' | 'moderate' | 'weak';
    if (spreadPercent < 0.1) agreement = 'strong';
    else if (spreadPercent < 0.5) agreement = 'moderate';
    else agreement = 'weak';

    consensus = {
      price: avgPrice,
      spread,
      spreadPercent,
      agreement
    };
  }

  const result: SpotPriceOutput = {
    commodity: input.commodity,
    quoteCurrency: input.quoteCurrency,
    prices,
    consensus,
    dataFreshness: new Date().toISOString()
  };

  ctx.cache.set(cacheKey, result, 'spotPrice');
  return result;
}
