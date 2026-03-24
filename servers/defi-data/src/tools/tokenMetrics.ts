import type { CacheManager } from '../utils/cache.js';
import type { CoinGeckoClient } from '../clients/coingecko.js';
import type { TokenMetricsInput, TokenMetricsOutput } from '../types/index.js';

interface TokenMetricsContext {
  cache: CacheManager;
  coingeckoClient: CoinGeckoClient;
}

export async function handleTokenMetrics(
  input: TokenMetricsInput,
  ctx: TokenMetricsContext
): Promise<TokenMetricsOutput> {
  // Check cache first
  const cacheKey = ctx.cache.generateKey('tokenMetrics', { tokenId: input.tokenId });
  const cached = ctx.cache.get<TokenMetricsOutput>(cacheKey);
  if (cached) return cached;

  // Fetch from CoinGecko
  const coinData = await ctx.coingeckoClient.getCoin(input.tokenId);
  const marketData = coinData.market_data;

  // Calculate derived metrics
  const circulatingToTotalRatio = marketData.total_supply
    ? (marketData.circulating_supply / marketData.total_supply) * 100
    : null;

  const result: TokenMetricsOutput = {
    tokenId: coinData.id,
    name: coinData.name,
    symbol: coinData.symbol.toUpperCase(),
    currentPrice: marketData.current_price.usd,
    priceChange24h: marketData.price_change_percentage_24h,
    priceChange7d: marketData.price_change_percentage_7d,
    marketCap: marketData.market_cap.usd,
    fullyDilutedValuation: marketData.fully_diluted_valuation?.usd ?? null,
    circulatingSupply: marketData.circulating_supply,
    totalSupply: marketData.total_supply,
    maxSupply: marketData.max_supply,
    circulatingToTotalRatio,
    allTimeHigh: marketData.ath.usd,
    allTimeHighDate: marketData.ath_date.usd,
    athDrawdown: marketData.ath_change_percentage.usd,
    dataFreshness: new Date().toISOString()
  };

  // Cache the result
  ctx.cache.set(cacheKey, result, 'tokenMetrics');

  return result;
}
